'use strict';

// Third batch of Meta AI gap reels: each was downloaded and checked frame by
// frame, then hosted on Drive. Kids reels carry their Meta AI illustration.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const local = read('js/catalog.json');
const drive = read('videos/drive-catalog.json');
const driveVideos = read('data/drive_videos.json');
const merged = TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), read('videos/youtube-catalog.json'), []);

const CODES = ['DeO1UALpOcl', 'DfZFgYmtAlg', 'DewMmR1g_fK', 'DbnMZxVzczS', 'Dbncde-TxFh', 'DbiJde7xSvd'];

function row(code) {
  return drive.items.find(function (e) { return e.sourceUrl === 'https://www.instagram.com/reel/' + code + '/'; });
}

test('every new reel is a playable Drive row with a poster file and a Drive listing', function () {
  CODES.forEach(function (c) {
    const e = row(c);
    assert.ok(e, c);
    assert.ok(fs.existsSync(path.join(root, e.poster)), e.poster);
    assert.equal(TH.playableKind(merged[e.id]), 'drive', e.id);
    assert.equal(TH.posterUrl(merged[e.id]), e.poster);
    const dv = driveVideos.find(function (v) { return v.fileId === e.driveId; });
    assert.ok(dv, c);
    assert.equal(dv.name, e.he + ' - ' + c + '.mp4');
    assert.equal(dv.folder, 'כושר/' + e.folder);
  });
});

test('kids reels are tagged for kids and fill the thin kids arm cells', function () {
  TH.setCatalog(merged);
  ['DbnMZxVzczS', 'Dbncde-TxFh', 'DbiJde7xSvd'].forEach(function (c) {
    assert.ok(TH.filterCatalog({ tag: 'kids' }).some(function (e) { return e.id === row(c).id; }), c);
  });
  assert.ok(TH.filterCatalog({ muscle: 'biceps', tag: 'kids' }).length >= 3);
  assert.ok(TH.filterCatalog({ muscle: 'triceps', tag: 'kids' }).length >= 2);
});

test('level gaps get a real clip', function () {
  TH.setCatalog(merged);
  [[{ muscle: 'back', equipment: 'none', level: 'intermediate' }, 'DeO1UALpOcl'],
    [{ muscle: 'legs', equipment: 'dumbbells', level: 'advanced' }, 'DfZFgYmtAlg'],
    [{ muscle: 'triceps', equipment: 'bar', level: 'beginner' }, 'DewMmR1g_fK'],
    [{ muscle: 'chest', equipment: 'bar', level: 'beginner' }, 'DewMmR1g_fK']].forEach(function (p) {
    assert.ok(TH.filterCatalog(p[0]).some(function (e) { return e.id === row(p[1]).id; }), JSON.stringify(p[0]));
  });
});

test('leg bands and the HIIT series show their illustration', function () {
  assert.equal(local['גומיות_רגליים'].poster, 'assets/posters/ill-1yIoF82iGPWJSVH4qlQ7x3nXIG9gSrzaX.jpg');
  const hiit = row('Dd2uFubv0A8');
  assert.equal(hiit.poster, 'assets/posters/ill-1hYvG6xfwQSJQT3fciteplc-EvZxY3xxN.jpg');
  [local['גומיות_רגליים'].poster, hiit.poster].forEach(function (p) { assert.ok(fs.existsSync(path.join(root, p)), p); });
});
