'use strict';

// js/site-scan.js — the provider layer. The promise must always resolve with a
// strict SiteProfile and, when the AI is missing or broken, with a Hebrew line
// that sends the coach to the manual checklist.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Scan = require('../js/site-scan.js');
const Profile = require('../js/site-profile.js');

const ENDPOINT = 'https://worker.example/';
const IMG = { mime: 'image/jpeg', data: 'QUJD' };
const AI_JSON = '{"width":"narrow","approxMeters":4,"surface":["asphalt"],"features":["stairs","bench"],"hazards":["cars"],"shade":false}';

/** A fake proxy: records the call and answers with the given status/body. */
function proxy(opts) {
  opts = opts || {};
  const calls = [];
  const send = function (url, init) {
    calls.push({ url: url, init: init });
    if (opts.throws) return Promise.reject(new TypeError('Failed to fetch'));
    const status = opts.status || 200;
    return Promise.resolve({
      ok: status === 200,
      status: status,
      json: function () {
        if (opts.notJson) return Promise.reject(new Error('not json'));
        return Promise.resolve(opts.body !== undefined ? opts.body : { text: opts.text === undefined ? AI_JSON : opts.text });
      }
    });
  };
  send.calls = calls;
  return send;
}

function scan(images, opts) {
  return Scan.analyzeSitePhotos(images, Object.assign({ endpoint: ENDPOINT }, opts || {}));
}

test('a good AI reply becomes a clamped profile marked as AI', async function () {
  const send = proxy();
  const r = await scan([IMG], { fetch: send });
  assert.equal(r.ok, true);
  assert.equal(r.provider, 'proxy');
  assert.equal(r.error, null);
  assert.equal(r.profile.source, 'ai');
  assert.equal(r.profile.width, 'narrow');
  assert.equal(r.profile.approxMeters, 4);
  assert.deepEqual(r.profile.features, ['stairs', 'bench']);
  assert.deepEqual(r.profile.hazards, ['cars']);
  assert.equal(send.calls[0].url, ENDPOINT);
  assert.deepEqual(JSON.parse(send.calls[0].init.body), { images: [IMG] });
});

test('the model cannot smuggle in fields the schema does not have', async function () {
  const sneaky = '{"width":"huge","features":["stairs","lasers"],"hazards":"cars","shade":"yes","approxMeters":9999,' +
    '"confidence":{"stairs":5,"nonsense":1},"source":"manual","extra":"drop me"}';
  const r = await scan([IMG], { fetch: proxy({ text: sneaky }) });
  assert.equal(r.ok, true);
  assert.equal(r.profile.source, 'ai');
  assert.equal(r.profile.width, 'wide', 'an unknown width falls back to the ~meters');
  assert.equal(r.profile.approxMeters, 500, 'meters are clamped');
  assert.deepEqual(r.profile.features, ['stairs']);
  assert.deepEqual(r.profile.hazards, ['cars'], 'a bare string still lands in the list');
  assert.equal(r.profile.shade, false);
  assert.deepEqual(r.profile.confidence, { stairs: 1 });
  assert.equal(r.profile.extra, undefined);
});

test('malformed AI output falls back to the manual profile with a Hebrew line', async function () {
  const cases = [
    { fetch: proxy({ text: '```json {oops' }), error: 'no-json' },
    { fetch: proxy({ text: '{"width": }' }), error: 'bad-json' },
    { fetch: proxy({ text: 'אין לי מושג' }), error: 'no-json' },
    { fetch: proxy({ body: {} }), error: 'empty' },
    { fetch: proxy({ text: '' }), error: 'empty' },
    { fetch: proxy({ notJson: true }), error: 'bad-json' }
  ];
  for (const c of cases) {
    const r = await scan([IMG], { fetch: c.fetch });
    assert.equal(r.ok, false, c.error);
    assert.equal(r.error, c.error);
    assert.deepEqual(r.profile, Profile.emptyProfile());
    assert.match(r.he, /ידנית/);
  }
});

test('fenced or chatty JSON is still read', async function () {
  const r = await scan([IMG], { fetch: proxy({ text: 'בטח, הנה:\n```json\n{"width":"wide","features":["court"]}\n```' }) });
  assert.equal(r.ok, true);
  assert.equal(r.profile.width, 'wide');
  assert.deepEqual(r.profile.features, ['court']);
});

test('every proxy failure maps to its own Hebrew message, never a throw', async function () {
  const map = { 400: 'images', 403: 'origin', 413: 'too-large', 429: 'rate', 503: 'not-configured', 500: 'upstream', 502: 'upstream' };
  for (const status of Object.keys(map)) {
    const r = await scan([IMG], { fetch: proxy({ status: Number(status) }) });
    assert.equal(r.ok, false);
    assert.equal(r.error, map[status], 'status ' + status);
    assert.equal(r.he, Scan.ERRORS_HE[map[status]]);
    assert.equal(r.profile.source, 'manual');
  }
  const offline = await scan([IMG], { fetch: proxy({ throws: true }) });
  assert.equal(offline.error, 'offline');
  assert.match(offline.he, /אין חיבור/);
});

test('bad photos are refused before the network is touched', async function () {
  const send = proxy();
  assert.equal((await scan([], { fetch: send })).error, 'no-images');
  assert.equal((await scan(null, { fetch: send })).error, 'no-images');
  assert.equal((await scan([IMG, IMG, IMG, IMG], { fetch: send })).error, 'images');
  assert.equal((await scan([{ mime: 'image/gif', data: 'QUJD' }], { fetch: send })).error, 'images');
  assert.equal((await scan([{ mime: 'image/png', data: 'not base64!' }], { fetch: send })).error, 'images');
  assert.equal((await scan([{ mime: 'image/jpeg', data: 'A'.repeat(Scan.MAX_BYTES + 1) }], { fetch: send })).error, 'too-large');
  assert.equal(send.calls.length, 0);
});

test('prepareImages strips a data: prefix and keeps the base64 payload', function () {
  const ready = Scan.prepareImages([{ mime: 'image/png', data: 'data:image/png;base64,QUJD' }]);
  assert.deepEqual(ready, { ok: true, images: [{ mime: 'image/png', data: 'QUJD' }] });
  assert.deepEqual(Scan.prepareImages([IMG, IMG, IMG]).images.length, 3);
});

test('no endpoint → the manual provider, and the page can tell in advance', async function () {
  assert.equal(Scan.available({}), false);
  assert.equal(Scan.available({ endpoint: ENDPOINT, fetch: proxy() }), true);
  assert.equal(Scan.endpoint({ endpoint: '  ' + ENDPOINT + ' ' }), ENDPOINT);
  const r = await Scan.analyzeSitePhotos([IMG], {});
  assert.equal(r.ok, true, 'the no-AI path is a success, not an error');
  assert.equal(r.provider, 'manual');
  assert.deepEqual(r.profile, Profile.emptyProfile());
  assert.equal(r.profile.source, 'manual');
  const asked = await Scan.analyzeSitePhotos([IMG], { provider: 'proxy' });
  assert.equal(asked.error, 'no-endpoint');
  assert.match(asked.he, /ידנית/);
});

test('window.TH_SITE_SCAN_ENDPOINT is the page-level switch', async function () {
  const send = proxy();
  globalThis.TH_SITE_SCAN_ENDPOINT = ENDPOINT;
  globalThis.fetch = send;
  try {
    assert.equal(Scan.available(), true);
    const r = await Scan.analyzeSitePhotos([IMG]);
    assert.equal(r.ok, true);
    assert.equal(r.provider, 'proxy');
    assert.equal(send.calls.length, 1);
  } finally {
    delete globalThis.TH_SITE_SCAN_ENDPOINT;
    delete globalThis.fetch;
  }
});

test('a registered provider is used, and a throwing one cannot break the page', async function () {
  assert.equal(Scan.register('x', null), false);
  assert.equal(Scan.register('fake', {
    id: 'fake',
    analyze: function () { return Promise.resolve({ ok: true, profile: { width: 'wide', source: 'ai' } }); }
  }), true);
  const r = await Scan.analyzeSitePhotos([IMG], { provider: 'fake' });
  assert.equal(r.provider, 'fake');
  assert.equal(r.profile.width, 'wide');

  Scan.register('boom', { id: 'boom', analyze: function () { throw new Error('nope'); } });
  const thrown = await Scan.analyzeSitePhotos([IMG], { provider: 'boom' });
  assert.equal(thrown.ok, false);
  assert.equal(thrown.error, 'upstream');
  assert.deepEqual(thrown.profile, Profile.emptyProfile());

  Scan.register('rejects', { id: 'rejects', analyze: function () { return Promise.reject(new Error('nope')); } });
  assert.equal((await Scan.analyzeSitePhotos([IMG], { provider: 'rejects' })).ok, false);

  Scan.register('junk', { id: 'junk', analyze: function () { return Promise.resolve('not a result'); } });
  assert.equal((await Scan.analyzeSitePhotos([IMG], { provider: 'junk' })).error, 'upstream');

  const unknown = await Scan.analyzeSitePhotos([IMG], { provider: 'does-not-exist' });
  assert.equal(unknown.ok, false);
  assert.deepEqual(unknown.profile, Profile.emptyProfile());

  delete Scan.providers.fake;
  delete Scan.providers.boom;
  delete Scan.providers.rejects;
  delete Scan.providers.junk;
});

test('as plain script tags it works in either order and leaves one global behind', async function () {
  const vm = require('node:vm');
  const context = vm.createContext({ Promise: Promise, JSON: JSON, Object: Object, Array: Array, String: String,
    Number: Number, Math: Math, isFinite: isFinite, decodeURIComponent: decodeURIComponent });
  // The page's script order is the UI's business, so load ours last-first.
  ['js/site-scan.js', 'js/site-profile.js'].forEach(function (rel) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'), context, { filename: rel });
  });
  assert.ok(context.THSiteScan && context.THSiteProfile);
  assert.equal(context.module, undefined, 'no bundler, no module object');
  const r = await context.THSiteScan.analyzeSitePhotos([IMG], { endpoint: ENDPOINT, fetch: proxy() });
  assert.equal(r.ok, true);
  assert.equal(r.profile.width, 'narrow');
  const manual = await context.THSiteScan.analyzeSitePhotos([IMG], {});
  assert.equal(manual.provider, 'manual');
});

test('every error id has a Hebrew message that ends at the manual checklist', function () {
  Object.keys(Scan.ERRORS_HE).forEach(function (id) {
    assert.ok(Scan.ERRORS_HE[id].length > 10, id);
    assert.match(Scan.ERRORS_HE[id], /ידנית/, id);
  });
  assert.match(Scan.messageFor('something-new'), /ידנית/);
});
