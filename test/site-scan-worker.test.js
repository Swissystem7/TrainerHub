'use strict';

// worker/site-scan/worker.mjs — the Gemini proxy, exercised with an injected
// fetch: no network, no key, nothing deployed. tests/test_site_scan.py checks
// that its prompt is byte-for-byte the one backend/site_scan.py sends.

const test = require('node:test');
const assert = require('node:assert/strict');

const ORIGIN = 'https://swissystem7.github.io';
const ENV = { GEMINI_API_KEY: 'test-key' };
const IMG = { mime: 'image/jpeg', data: 'QUJD' };

let W;
test.before(async function () {
  W = await import('../worker/site-scan/worker.mjs');
});

function post(body, opts) {
  opts = opts || {};
  const headers = { 'Content-Type': 'application/json' };
  const origin = 'origin' in opts ? opts.origin : ORIGIN;
  if (origin) headers.Origin = origin;
  if (opts.ip) headers['CF-Connecting-IP'] = opts.ip;
  return new Request('https://worker.example/', {
    method: opts.method || 'POST',
    headers: headers,
    body: opts.method && opts.method !== 'POST' ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
  });
}

/** A fake Gemini: records the call, replies with whatever the test asked for. */
function upstream(opts) {
  opts = opts || {};
  const calls = [];
  const send = function (url, init) {
    calls.push({ url: url, init: init });
    if (opts.throws) return Promise.reject(new Error('down'));
    return Promise.resolve({
      ok: opts.status ? opts.status === 200 : true,
      status: opts.status || 200,
      json: function () {
        if (opts.notJson) return Promise.reject(new Error('not json'));
        if (opts.body !== undefined) return Promise.resolve(opts.body);
        const text = opts.text === undefined ? '{"width":"narrow"}' : opts.text;
        return Promise.resolve({ candidates: [{ content: { parts: [{ text: text }] } }] });
      }
    });
  };
  send.calls = calls;
  return send;
}

// A fresh limiter per call: only the throttling test below should ever see a 429.
async function run(request, env, send) {
  const deps = { fetch: send || upstream(), limiter: W.createLimiter(W.RATE.requests, W.RATE.windowMs) };
  const res = await W.handle(request, env === undefined ? ENV : env, deps);
  const text = await res.text();
  return { res: res, status: res.status, body: text ? JSON.parse(text) : null };
}

test('validateImages accepts 1-3 base64 photos and nothing else', function () {
  assert.ok(W.validateImages([IMG]));
  assert.ok(W.validateImages([IMG, IMG, IMG]));
  assert.ok(!W.validateImages([]));
  assert.ok(!W.validateImages([IMG, IMG, IMG, IMG]));
  assert.ok(!W.validateImages(null));
  assert.ok(!W.validateImages('QUJD'));
  assert.ok(!W.validateImages([{ mime: 'image/gif', data: 'QUJD' }]));
  assert.ok(!W.validateImages([{ mime: 'image/png', data: 'not base64!' }]));
  assert.ok(!W.validateImages([{ mime: 'image/png', data: '' }]));
  assert.ok(!W.validateImages([{ mime: 'image/png' }]));
});

test('CORS is restricted to the GitHub Pages site plus localhost and configured origins', function () {
  assert.equal(W.allowedOrigin(ORIGIN, {}), ORIGIN);
  assert.equal(W.allowedOrigin('http://localhost:8000', {}), 'http://localhost:8000');
  assert.equal(W.allowedOrigin('http://127.0.0.1:5500', {}), 'http://127.0.0.1:5500');
  assert.equal(W.allowedOrigin('https://evil.example', {}), '');
  assert.equal(W.allowedOrigin('https://swissystem7.github.io.evil.example', {}), '');
  assert.equal(W.allowedOrigin('', {}), '');
  assert.equal(W.allowedOrigin('https://acharai.org.il', { ALLOWED_ORIGINS: 'https://acharai.org.il, https://x.test' }), 'https://acharai.org.il');
});

test('a photo scan returns the model text and keeps the key out of the URL', async function () {
  const send = upstream({ text: '{"width":"narrow","features":["stairs"]}' });
  const out = await run(post({ images: [IMG, IMG] }), ENV, send);
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { text: '{"width":"narrow","features":["stairs"]}' });
  assert.equal(out.res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(out.res.headers.get('Cache-Control'), 'no-store');
  const call = send.calls[0];
  assert.match(call.url, /gemini-2\.5-flash:generateContent$/);
  assert.ok(!call.url.includes('test-key'), 'key never in the URL');
  assert.equal(call.init.headers['x-goog-api-key'], 'test-key');
  const parts = JSON.parse(call.init.body).contents[0].parts;
  assert.deepEqual(parts[0], { text: W.PROMPT });
  assert.equal(parts.length, 3);
  assert.deepEqual(parts[1], { inline_data: { mime_type: 'image/jpeg', data: 'QUJD' } });
});

test('GEMINI_MODEL overrides the model', async function () {
  const send = upstream();
  await run(post({ images: [IMG] }), { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x' }, send);
  assert.match(send.calls[0].url, /\/gemini-x:generateContent$/);
});

test('preflight, wrong method and foreign origins are refused', async function () {
  const pre = await W.handle(post(null, { method: 'OPTIONS' }), ENV, { fetch: upstream() });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.equal(pre.headers.get('Vary'), 'Origin');
  const foreignPre = await W.handle(post(null, { method: 'OPTIONS', origin: 'https://evil.example' }), ENV, { fetch: upstream() });
  assert.equal(foreignPre.status, 403);
  assert.equal(foreignPre.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await run(post(null, { method: 'GET' }))).status, 405);
  const foreign = await run(post({ images: [IMG] }, { origin: 'https://evil.example' }));
  assert.equal(foreign.status, 403);
  assert.deepEqual(foreign.body, { error: 'origin' });
  assert.equal((await run(post({ images: [IMG] }, { origin: null }))).status, 403, 'no Origin header is refused too');
});

test('no key configured → 503 and Gemini is never called', async function () {
  const send = upstream();
  const out = await run(post({ images: [IMG] }), {}, send);
  assert.equal(out.status, 503);
  assert.deepEqual(out.body, { error: 'not-configured' });
  assert.equal(send.calls.length, 0);
});

test('bad input is refused before any upstream call', async function () {
  const send = upstream();
  assert.deepEqual((await run(post('{nope'), ENV, send)).body, { error: 'bad-json' });
  assert.deepEqual((await run(post([1, 2]), ENV, send)).body, { error: 'images' });
  assert.deepEqual((await run(post({ images: [] }), ENV, send)).body, { error: 'images' });
  assert.deepEqual((await run(post({ images: [IMG, IMG, IMG, IMG] }), ENV, send)).body, { error: 'images' });
  const big = await run(post({ images: [{ mime: 'image/jpeg', data: 'A'.repeat(W.MAX_BYTES + 1) }] }), ENV, send);
  assert.equal(big.status, 413);
  assert.deepEqual(big.body, { error: 'too-large' });
  assert.equal(send.calls.length, 0);
});

test('upstream trouble becomes 502, never a 200 with junk', async function () {
  const failed = await run(post({ images: [IMG] }), ENV, upstream({ status: 429 }));
  assert.equal(failed.status, 502);
  assert.deepEqual(failed.body, { error: 'upstream', status: 429 });
  assert.deepEqual((await run(post({ images: [IMG] }), ENV, upstream({ throws: true }))).body, { error: 'upstream' });
  assert.deepEqual((await run(post({ images: [IMG] }), ENV, upstream({ notJson: true }))).body, { error: 'empty' });
  assert.deepEqual((await run(post({ images: [IMG] }), ENV, upstream({ body: { candidates: [] } }))).body, { error: 'empty' });
  assert.deepEqual((await run(post({ images: [IMG] }), ENV, upstream({ text: '' }))).body, { error: 'empty' });
});

test('replyText joins the parts of the first candidate', function () {
  assert.equal(W.replyText({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: '1}' }, {}] } }] }), '{"a":1}');
  assert.equal(W.replyText({ candidates: [{ content: { parts: 'x' } }] }), '');
  assert.equal(W.replyText({}), '');
  assert.equal(W.replyText(null), '');
});

test('the per-IP limiter caps a burst and lets the next window through', function () {
  const check = W.createLimiter(2, 1000);
  assert.ok(check('1.1.1.1', 1000));
  assert.ok(check('1.1.1.1', 1100));
  assert.ok(!check('1.1.1.1', 1200), 'third call in the window is blocked');
  assert.ok(check('2.2.2.2', 1200), 'another coach is unaffected');
  assert.ok(check('1.1.1.1', 2200), 'the window moved on');
});

test('a throttled request gets 429 and does not reach Gemini', async function () {
  const send = upstream();
  const limiter = W.createLimiter(1, 60000);
  const deps = { fetch: send, limiter: limiter, now: function () { return 1000; } };
  const first = await W.handle(post({ images: [IMG] }, { ip: '9.9.9.9' }), ENV, deps);
  assert.equal(first.status, 200);
  const second = await W.handle(post({ images: [IMG] }, { ip: '9.9.9.9' }), ENV, deps);
  assert.equal(second.status, 429);
  assert.deepEqual(JSON.parse(await second.text()), { error: 'rate' });
  assert.equal(send.calls.length, 1);
});

test('the Worker stores nothing: no KV/D1 binding and no body logging', async function () {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..', 'worker', 'site-scan');
  const src = fs.readFileSync(path.join(root, 'worker.mjs'), 'utf8');
  const toml = fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8');
  assert.ok(!/console\.(log|info|warn|error)/.test(src), 'nothing is logged');
  assert.ok(!/kv_namespaces|d1_databases|r2_buckets/.test(toml), 'no storage binding');
  assert.ok(!/GEMINI_API_KEY\s*=/.test(toml), 'the key is a secret, never in wrangler.toml');
});
