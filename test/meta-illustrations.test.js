'use strict';

// Meta AI illustrations: one distinct image per exercise, shown instead of a
// video frame that repeated another exercise or did not show the movement.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const TH = require('../js/core.js');
const THReels = require('../js/reel-library.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const local = read('js/catalog.json');
const drive = read('videos/drive-catalog.json');
const youtube = read('videos/youtube-catalog.json');
const driveVideos = read('data/drive_videos.json');
const reels = read('data/exercises.json').exercises;

const ILL = /^assets\/posters\/ill-[A-Za-z0-9_-]+\.jpg$/;
const rows = [];
Object.keys(local).forEach(function (k) { if (ILL.test(local[k].poster || '')) rows.push(Object.assign({ id: k }, local[k])); });
drive.items.concat(youtube.items).forEach(function (e) { if (ILL.test(e.poster || '')) rows.push(e); });
const reelRows = reels.filter(function (r) { return r.id === 'ig-DdHOFvtKk9z' || r.id === 'ig-Dart5bjomQ5'; });

test('165 catalog rows and 2 reels carry their own illustration file', function () {
  assert.equal(rows.length, 165);
  assert.equal(reelRows.filter(function (r) { return r.poster; }).length, 2);
});

test('no two exercises share an illustration', function () {
  const all = rows.concat(reelRows);
  const byPath = new Map();
  all.forEach(function (r) {
    const list = byPath.get(r.poster) || [];
    list.push(r);
    byPath.set(r.poster, list);
  });
  byPath.forEach(function (list, poster) {
    const names = new Set(list.map(function (r) { return r.he || r.name_he || r.id; }));
    assert.equal(names.size, 1, 'shared poster ' + poster + ' used by ' + Array.from(names).join(','));
  });
  const paths = Array.from(byPath.keys());
  const hashes = paths.map(function (p) {
    assert.ok(fs.existsSync(path.join(root, p)), p);
    return crypto.createHash('md5').update(fs.readFileSync(path.join(root, p))).digest('hex');
  });
  assert.equal(new Set(hashes).size, hashes.length);
});

test('library, builder and workout cards show the illustration', function () {
  const merged = TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), youtube, []);
  TH.setCatalog(merged);
  rows.forEach(function (r) {
    const listed = TH.catalogList().find(function (x) { return x.id === r.id; });
    const html = TH.mediaMarkup(listed, { className: 'ex-media' });
    assert.ok(html.indexOf(r.poster) !== -1, r.id);
    assert.ok(html.indexOf('th-facade-thumb') !== -1, r.id);
  });
});

test('Drive cards on the exercises page show the illustration', function () {
  const withPoster = driveVideos.filter(function (v) { return v.poster; });
  assert.equal(withPoster.length, 73);
  const cards = THReels.driveVideosToExercises(driveVideos);
  const esc = function (s) { return String(s); };
  withPoster.forEach(function (v) {
    const ex = cards.find(function (c) { return c.file_id === v.fileId; });
    assert.ok(ex, v.fileId);
    assert.ok(THReels.exerciseCardHtml(ex, esc).indexOf(v.poster) !== -1, v.name);
  });
  const plain = cards.find(function (c) { return !c.poster; });
  assert.ok(THReels.exerciseCardHtml(plain, esc).indexOf('drive.google.com/thumbnail') !== -1);
});
