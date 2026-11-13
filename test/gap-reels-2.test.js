'use strict';

// Second batch of Meta AI gap reels: each was downloaded and checked frame by
// frame, then hosted on Drive. Seven carry their own Meta AI illustration.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const drive = read('videos/drive-catalog.json');
const youtube = read('videos/youtube-catalog.json');
const driveVideos = read('data/drive_videos.json');
const merged = TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), drive, []), youtube, []);

const CODES = ['DfN1a-ixAEh', 'DEdnZTDyOR4', 'DeFxnTUMAdl', 'DOITmPRjLeZ', 'DfkGcnTtKwQ',
  'DVSSS7dCZmF', 'DatSixZpEoY', 'DbYGBdJp_-Z', 'Dd2uFubv0A8', 'DZs_ftUBacO'];

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

test('thin builder combos now have a real clip', function () {
  const ids = CODES.map(function (c) { return row(c).id; });
  const rows = ids.map(function (id) { return merged[id]; }).filter(TH.isPlayable);
  assert.equal(rows.length, CODES.length);
  [['triceps', 'basketball'], ['shoulders', 'football'], ['triceps', 'football'], ['chest', 'bar'],
    ['legs', 'bar'], ['back', 'bar'], ['chest', 'stairs'], ['shoulders', 'stairs'], ['triceps', 'ball']]
    .forEach(function (pair) {
      assert.ok(rows.some(function (e) {
        return e.muscles.indexOf(pair[0]) !== -1 && e.equipment.indexOf(pair[1]) !== -1;
      }), pair.join('+'));
    });
});

test('archer pull-up shows its illustration', function () {
  const e = youtube.items.find(function (x) { return x.id === 'yt_archer_pull_ups'; });
  assert.equal(e.poster, 'assets/posters/ill-Z7GdTkOEe5Y.jpg');
  assert.ok(fs.existsSync(path.join(root, e.poster)));
});
