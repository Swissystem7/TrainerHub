'use strict';

// Hosted MP4 copies (Swissystem7/TrainerHub-media): a Drive clip with a copy
// plays in a native <video> from GitHub Pages, then jsDelivr, then the Drive
// player as the last fallback.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'videos/media-manifest.json'), 'utf8'));
const ID = '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r';
const PAGES = 'https://swissystem7.github.io/TrainerHub-media/';
const CDN = 'https://cdn.jsdelivr.net/gh/Swissystem7/TrainerHub-media@v1/';

function fakeDoc() {
  const doc = {
    createElement: function (tag) {
      const el = { tagName: tag.toUpperCase(), attrs: {}, listeners: {}, played: 0, loaded: 0, ownerDocument: doc };
      el.setAttribute = function (k, v) { el.attrs[k] = String(v); };
      el.getAttribute = function (k) { return k in el.attrs ? el.attrs[k] : null; };
      el.addEventListener = function (t, fn) { el.listeners[t] = fn; };
      el.play = function () { el.played++; return Promise.resolve(); };
      el.load = function () { el.loaded++; };
      el.focus = function () {};
      return el;
    }
  };
  return doc;
}
function facade(doc, src) {
  const parent = { replaced: null, replaceChild: function (n, o) { this.replaced = [n, o]; n.parentNode = this; } };
  const attrs = { 'data-th-frame': src, 'data-th-frame-title': 'פלאנק', class: 'ex-media ex-media-facade' };
  const btn = { ownerDocument: doc, parentNode: parent, getAttribute: (k) => (k in attrs ? attrs[k] : null) };
  return { btn, parent };
}

test('the committed manifest lists Pages first, a pinned jsDelivr tag second, and well-formed paths', function () {
  assert.equal(manifest.hosts[0], PAGES);
  assert.match(manifest.hosts[1], /^https:\/\/cdn\.jsdelivr\.net\/gh\/Swissystem7\/TrainerHub-media@[A-Za-z0-9._-]+\/$/);
  const files = Object.entries(manifest.files);
  assert.ok(files.length > 400, 'most Drive clips have a hosted copy');
  files.forEach(([id, p]) => {
    assert.match(id, /^[A-Za-z0-9_-]{20,}$/);
    assert.match(p, /^[a-z0-9_-]+\/[A-Za-z0-9_-]{20,}\.mp4$/);
    assert.ok(p.endsWith('/' + id + '.mp4'), 'file is named by its Drive id');
  });
  // Every Drive clip the app plays is in the manifest.
  const cat = JSON.parse(fs.readFileSync(path.join(root, 'videos/drive-catalog.json'), 'utf8')).items
    .concat(Object.values(JSON.parse(fs.readFileSync(path.join(root, 'js/catalog.json'), 'utf8'))));
  JSON.parse(fs.readFileSync(path.join(root, 'data/drive_videos.json'), 'utf8')).forEach((x) => cat.push({ driveId: x.fileId }));
  const missing = cat.filter((e) => e.available !== false).map((e) => (/^https?:/.test(e.file || '') && e.drivePlayId) || e.driveId)
    .filter((id) => id && !manifest.files[id]);
  assert.deepEqual(missing, []);
});

test('mp4Sources only trusts the media repo hosts and well-formed paths', function () {
  TH.setMediaManifest({ hosts: [PAGES, 'https://evil.example/', CDN], files: { [ID]: 'core/' + ID + '.mp4', bad: 'x.mp4', ['1'.repeat(25)]: '../../x.mp4' } });
  assert.deepEqual(TH.mp4Sources(ID), [PAGES + 'core/' + ID + '.mp4', CDN + 'core/' + ID + '.mp4']);
  assert.deepEqual(TH.mp4Sources('bad'), []);
  assert.deepEqual(TH.mp4Sources('1'.repeat(25)), []);
  assert.deepEqual(TH.mp4Sources('toString'), []);
});

test('a tap on a Drive facade with a hosted copy plays a native <video> at once', function () {
  TH.setMediaManifest({ hosts: [PAGES, CDN], files: { [ID]: 'core/' + ID + '.mp4' } });
  const src = 'https://drive.google.com/file/d/' + ID + '/preview';
  TH.registerFrameSrc(src);
  const doc = fakeDoc();
  const { btn, parent } = facade(doc, src);
  const v = TH.activateMediaFrame(btn);
  assert.equal(v.tagName, 'VIDEO');
  assert.equal(v.attrs.src, PAGES + 'core/' + ID + '.mp4');
  assert.equal(v.attrs.class, 'ex-media th-mp4');
  assert.equal(v.attrs.playsinline, '');
  assert.equal(v.attrs.controls, '');
  assert.equal(v.played, 1, 'play() runs inside the tap');
  assert.equal(parent.replaced[1], btn);
  // Pages fails -> jsDelivr; jsDelivr fails -> Drive player.
  v.listeners.error();
  assert.equal(v.attrs.src, CDN + 'core/' + ID + '.mp4');
  assert.equal(v.played, 2);
  v.listeners.error();
  const frame = parent.replaced[0];
  assert.equal(frame.tagName, 'IFRAME');
  assert.equal(frame.attrs.src, 'https://drive.google.com/file/d/' + ID + '/preview?autoplay=1');
  assert.equal(frame.attrs.class, 'ex-media');
});

test('without a hosted copy the Drive player is used as before', function () {
  TH.setMediaManifest({ hosts: [PAGES, CDN], files: {} });
  const src = 'https://drive.google.com/file/d/1ZvTfInYpDspk7eqZ2NRNPi-L8hDGeypQ/preview';
  TH.registerFrameSrc(src);
  const { btn } = facade(fakeDoc(), src);
  const f = TH.activateMediaFrame(btn);
  assert.equal(f.tagName, 'IFRAME');
  assert.equal(f.attrs.src, src + '?autoplay=1');
});

test('workout mode (eager) renders the hosted <video> with a Drive fallback hook', function () {
  TH.setMediaManifest({ hosts: [PAGES, CDN], files: { [ID]: 'core/' + ID + '.mp4' } });
  const html = TH.mediaMarkup({ he: 'פלאנק', driveId: ID, source: 'drive' }, { className: 'ex-media', eager: true });
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, new RegExp('<video class="ex-media th-mp4"[^>]*data-th-mp4="' + ID + '"[^>]*playsinline[^>]*src="' + PAGES.replace(/[./]/g, '\\$&') + 'core/' + ID + '\\.mp4"'));
  assert.match(html, /onerror="window\.TH&&TH\.mediaFallback\(this\)"/);
  TH.setMediaManifest({ hosts: [PAGES, CDN], files: {} });
  assert.match(TH.mediaMarkup({ he: 'פלאנק', driveId: ID, source: 'drive' }, { className: 'ex-media', eager: true }), /<iframe/);
});
