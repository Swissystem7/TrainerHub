'use strict';

// Meta AI originals replace third-party players. Existing exercise ids stay.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const originals = read('videos/originals-catalog.json');
const manifest = read('videos/media-manifest.json');
const THIRD = /youtube\.com|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|drive\.google\.com|i\.ytimg\.com|<iframe/;

function load() {
  TH.setMediaManifest(manifest);
  let merged = TH.mergeCatalogs(
    TH.mergeCatalogs(read('js/catalog.json'), read('videos/drive-catalog.json'), []),
    read('videos/youtube-catalog.json'),
    []
  );
  merged = TH.mergeCatalogs(merged, originals, []);
  TH.setCatalog(merged);
}

test('every original is a catalog exercise with a hosted mp4', function () {
  load();
  assert.equal(originals.items.length, 107);
  originals.items.forEach(function (clip) {
    assert.equal(manifest.files[clip.id], clip.folder && manifest.files[clip.id]);
    assert.match(manifest.files[clip.mediaId], new RegExp('/' + clip.mediaId + '\\.mp4$'));
    const row = TH.catalog[clip.id];
    assert.equal(row.he, clip.he, clip.id);
    assert.equal(row.original, true, clip.id);
    assert.deepEqual(row.muscles, clip.muscles);
    const html = TH.mediaMarkup(row, { className: 'ex-media', eager: true });
    assert.match(html, new RegExp('src="https://swissystem7\\.github\\.io/TrainerHub-media/' + manifest.files[clip.mediaId].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"'));
    assert.doesNotMatch(html, THIRD);
  });
});

test('every match id plays an original and keeps its id', function () {
  load();
  const ids = new Set();
  originals.items.forEach(function (clip) {
    clip.covers.forEach(function (id) { ids.add(id); });
  });
  assert.equal(ids.size, 83);
  ids.forEach(function (id) {
    const found = TH.findExercise({ id: id, name: id });
    assert.equal(found.id, id, id);
    const html = TH.mediaMarkup(found, { className: 'ex-media', eager: true });
    assert.match(html, /metaai-[a-z0-9-]+\.mp4/, id);
    assert.match(html, /<video/, id);
    assert.doesNotMatch(html, THIRD, id);
  });
});

test('an exercise with no original shows a placeholder and no third-party URL', function () {
  load();
  const row = TH.catalog.yt_hamstring_lunge || TH.catalogList().find(function (e) {
    return e.source === 'youtube' && e.thirdParty;
  });
  assert.ok(row);
  const html = TH.mediaMarkup(row, { className: 'ex-media', eager: true });
  assert.match(html, /הסרטון יעלה בקרוב/);
  assert.doesNotMatch(html, THIRD);
  assert.equal(TH.isPlayable(row), true);
});
