'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const Scan = require('../js/site-scan.js');

const IMG = { mime: 'image/jpeg', data: 'QUJD' };
const ORIGIN = 'https://swissystem7.github.io';
const workerUrl = pathToFileURL(path.join(__dirname, '..', 'worker', 'site-scan', 'worker.mjs')).href;

function res(status, body) {
  return { ok: status >= 200 && status < 300, status, json: function () { return Promise.resolve(body); } };
}

test('no endpoint or no photos → manual fallback, no network call', async function () {
  let called = false;
  const spy = function () { called = true; };
  const a = await Scan.analyzeSitePhotos([IMG], { fetch: spy });
  assert.equal(a.ok, false);
  assert.equal(a.error, 'no-endpoint');
  assert.equal(a.profile.source, 'manual');
  const b = await Scan.analyzeSitePhotos([], { endpoint: 'https://x', fetch: spy });
  assert.equal(b.error, 'no-images');
  assert.equal(called, false);
});

test('good proxy reply → AI profile; at most 3 photos are sent', async function () {
  let sent;
  const r = await Scan.analyzeSitePhotos([IMG, IMG, IMG, IMG], {
    endpoint: 'https://scan.example',
    fetch: function (url, init) { sent = JSON.parse(init.body); return Promise.resolve(res(200, { text: '{"width":"narrow","features":["stairs"]}' })); }
  });
  assert.equal(sent.images.length, 3);
  assert.equal(r.ok, true);
  assert.equal(r.profile.source, 'ai');
  assert.deepEqual(r.profile.features, ['stairs']);
});

test('offline, HTTP errors and malformed replies all resolve to the checklist', async function () {
  const cases = [
    function () { return Promise.reject(new Error('offline')); },
    function () { throw new Error('sync throw'); },
    function () { return Promise.resolve(res(429, { error: 'rate-limited' })); },
    function () { return Promise.resolve(res(200, { text: 'sorry, I cannot' })); },
    function () { return Promise.resolve(res(200, null)); }
  ];
  const errors = [];
  for (const f of cases) {
    const r = await Scan.analyzeSitePhotos([IMG], { endpoint: 'https://scan.example', fetch: f });
    assert.equal(r.ok, false);
    assert.equal(r.profile.source, 'manual');
    errors.push(r.error);
  }
  assert.deepEqual(errors, ['offline', 'offline', 'http-429', 'no-json', 'no-json']);
});

function req(body, init) {
  init = init || {};
  return new Request('https://worker.example/', {
    method: init.method || 'POST',
    headers: Object.assign({ Origin: ORIGIN, 'CF-Connecting-IP': init.ip || '1.1.1.1' }, init.headers || {}),
    body: init.method === 'OPTIONS' || init.method === 'GET' ? undefined : JSON.stringify(body)
  });
}

test('worker: CORS locked to the Pages origin, key required, inputs validated', async function () {
  const W = await import(workerUrl);
  const env = { GEMINI_API_KEY: 'k' };
  const never = function () { throw new Error('should not call upstream'); };
  assert.equal((await W.handle(req({ images: [IMG] }, { headers: { Origin: 'https://evil.example' } }), env, never)).status, 403);
  const pre = await W.handle(req(null, { method: 'OPTIONS' }), env, never);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal((await W.handle(req(null, { method: 'GET' }), env, never)).status, 405);
  assert.equal((await W.handle(req({ images: [IMG] }), {}, never)).status, 503);
  assert.equal((await W.handle(req({ images: [] }, { ip: '2.2.2.2' }), env, never)).status, 400);
  assert.equal((await W.handle(req({ images: [IMG, IMG, IMG, IMG] }, { ip: '2.2.2.3' }), env, never)).status, 400);
  assert.equal((await W.handle(req({ images: [{ mime: 'text/html', data: 'QUJD' }] }, { ip: '2.2.2.4' }), env, never)).status, 400);
});

test('worker: forwards to Gemini with the key in a header and returns the text', async function () {
  const W = await import(workerUrl);
  let call;
  const upstream = function (url, init) {
    call = { url, init };
    return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"width":"wide"}' }] } }] })));
  };
  const out = await W.handle(req({ images: [IMG] }, { ip: '3.3.3.3' }), { GEMINI_API_KEY: 'secret' }, upstream);
  assert.equal(out.status, 200);
  assert.deepEqual(await out.json(), { text: '{"width":"wide"}' });
  assert.match(call.url, /gemini-2\.5-flash:generateContent$/);
  assert.equal(call.init.headers['x-goog-api-key'], 'secret');
  assert.ok(!call.url.includes('secret'), 'key never in the URL');
  const body = JSON.parse(call.init.body);
  assert.equal(body.contents[0].parts[0].text, W.PROMPT);
  assert.deepEqual(body.contents[0].parts[1], { inline_data: { mime_type: 'image/jpeg', data: 'QUJD' } });
});

test('worker: rate limit per IP', async function () {
  const W = await import(workerUrl);
  const ok = function () { return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }))); };
  const statuses = [];
  for (let i = 0; i <= W.LIMITS.perMinute; i++) {
    statuses.push((await W.handle(req({ images: [IMG] }, { ip: '9.9.9.9' }), { GEMINI_API_KEY: 'k' }, ok, 1000 + i)).status);
  }
  assert.equal(statuses.filter(function (s) { return s === 200; }).length, W.LIMITS.perMinute);
  assert.equal(statuses[statuses.length - 1], 429);
});
