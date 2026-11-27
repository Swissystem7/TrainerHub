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
      el.setAttribute = function (k, v) {
        el.attrs[k] = String(v);
      };
      el.getAttribute = function (k) {
        return k in el.attrs ? el.attrs[k] : null;
      };
      el.addEventListener = function (t, fn) {
        el.listeners[t] = fn;
      };
      el.play = function () {
        el.played++;
        return Promise.resolve();
      };
      el.load = function () {
        el.loaded++;
      };
      el.focus = function () {};
      return el;
    }
  };
  return doc;
}
function facade(doc, src) {
  const parent = {
    replaced: null,
    replaceChild: function (n, o) {
      this.replaced = [n, o];
      n.parentNode = this;
    }
  };
  const attrs = { 'data-th-frame': src, 'data-th-frame-title': 'פלאנק', class: 'ex-media ex-media-facade' };
  const btn = { ownerDocument: doc, parentNode: parent, getAttribute: (k) => (k in attrs ? attrs[k] : null) };
  return { btn, parent };
}

test('the committed manifest lists Pages first, a pinned jsDelivr tag second, and well-formed paths', function () {
  assert.equal(manifest.hosts[0], PAGES);
  assert.match(
    manifest.hosts[1],
    /^https:\/\/cdn\.jsdelivr\.net\/gh\/Swissystem7\/TrainerHub-media@[A-Za-z0-9._-]+\/$/
  );
  const files = Object.entries(manifest.files);
  assert.ok(files.length > 400, 'most Drive clips have a hosted copy');
  files.forEach(([id, p]) => {
    assert.match(id, /^(?:[A-Za-z0-9_-]{20,}|metaai-[a-z0-9]+(?:-[a-z0-9]+)*)$/);
    assert.match(p, /^[a-z0-9_-]+\/(?:[A-Za-z0-9_-]{20,}|metaai-[a-z0-9]+(?:-[a-z0-9]+)*)\.mp4$/);
    assert.ok(p.endsWith('/' + id + '.mp4'), 'file is named by its id');
  });
  assert.equal(manifest.files['metaai-e01-01'], 'shoulders/metaai-e01-01.mp4');
  // Every Drive clip the app plays is in the manifest.
  const cat = JSON.parse(fs.readFileSync(path.join(root, 'videos/drive-catalog.json'), 'utf8')).items.concat(
    Object.values(JSON.parse(fs.readFileSync(path.join(root, 'js/catalog.json'), 'utf8')))
  );
  JSON.parse(fs.readFileSync(path.join(root, 'data/drive_videos.json'), 'utf8')).forEach((x) =>
    cat.push({ driveId: x.fileId })
  );
  const missing = cat
    .filter((e) => e.available !== false)
    .map((e) => (/^https?:/.test(e.file || '') && e.drivePlayId) || e.driveId)
    .filter((id) => id && !manifest.files[id]);
  assert.deepEqual(missing, []);
});

test('mp4Sources only trusts the media repo hosts and well-formed paths', function () {
  TH.setMediaManifest({
    hosts: [PAGES, 'https://evil.example/', CDN],
    files: { [ID]: 'core/' + ID + '.mp4', bad: 'x.mp4', ['1'.repeat(25)]: '../../x.mp4' }
  });
  assert.deepEqual(TH.mp4Sources(ID), [PAGES + 'core/' + ID + '.mp4', CDN + 'core/' + ID + '.mp4']);
  assert.deepEqual(TH.mp4Sources('bad'), []);
  assert.deepEqual(TH.mp4Sources('1'.repeat(25)), []);
  assert.deepEqual(TH.mp4Sources('toString'), []);
});

test('a tap on an owned hosted copy plays a native <video> and does not fall back to Drive', function () {
  TH.setCatalog({
    plank: {
      id: 'plank', he: 'פלאנק', source: 'onedrive', muscles: ['core'], equipment: ['none'],
      file: 'https://github.com/Swissystem7/TrainerHub/releases/download/trainerhub-media-v1/thv-015.mp4',
      drivePlayId: ID, available: true
    }
  });
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
  assert.equal(TH.mediaFallback(v), null);
  assert.equal(parent.replaced[0].tagName, 'VIDEO');
  assert.doesNotMatch(JSON.stringify(parent.replaced[0].attrs), /drive\.google\.com/);
});

test('a Drive or YouTube facade never becomes an embed', function () {
  TH.setMediaManifest({ hosts: [PAGES, CDN], files: {} });
  const src = 'https://drive.google.com/file/d/1ZvTfInYpDspk7eqZ2NRNPi-L8hDGeypQ/preview';
  TH.registerFrameSrc(src);
  const { btn } = facade(fakeDoc(), src);
  assert.equal(TH.activateMediaFrame(btn), null);
});

test('workout mode shows an owned hosted video, and a third-party clip as coming soon', function () {
  TH.setCatalog({
    plank: {
      id: 'plank', he: 'פלאנק', source: 'onedrive', muscles: ['core'], equipment: ['none'],
      file: 'https://github.com/Swissystem7/TrainerHub/releases/download/trainerhub-media-v1/thv-015.mp4',
      drivePlayId: ID, available: true
    }
  });
  TH.setMediaManifest({ hosts: [PAGES, CDN], files: { [ID]: 'core/' + ID + '.mp4' } });
  const owned = TH.mediaMarkup(TH.catalog.plank, { className: 'ex-media', eager: true });
  assert.match(owned, /<video/);
  assert.match(owned, new RegExp(PAGES.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 'core/' + ID + '\\.mp4'));
  assert.doesNotMatch(owned, /<iframe|drive\.google\.com/);
  const html = TH.mediaMarkup({ he: 'פלאנק', driveId: ID, source: 'drive' }, { className: 'ex-media', eager: true });
  assert.match(html, /הסרטון יעלה בקרוב/);
  assert.doesNotMatch(html, /<iframe|<video|drive\.google\.com/);
});
