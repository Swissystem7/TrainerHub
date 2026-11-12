'use strict';

// Instagram reels uploaded to the Drive «כושר» folders. They have no release
// file: each card plays the live Drive copy through the Drive preview player.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const drive = read('videos/drive-catalog.json');
const local = read('js/catalog.json');
const youtube = read('videos/youtube-catalog.json');
const driveVideos = read('data/drive_videos.json');
const reels = read('data/exercises.json').exercises;

const REELS = drive.items.filter(function (e) { return e.source === 'drive' && e.available && e.sourceUrl; });
const FOLDERS = new Set(['חזה', 'גב', 'כתפיים', 'ידיים', 'רגליים', 'בטן']);
const EQUIPMENT = new Set(['none', 'band', 'cones', 'ball', 'football', 'basketball', 'tennis-ball', 'bar', 'stairs', 'dumbbells', 'kettlebell', 'barbell']);

test('Drive-hosted reels are registered', function () {
  assert.ok(REELS.length >= 25);
  assert.equal(drive._meta.driveReelCount, REELS.length);
});

test('each Drive-hosted reel has one Instagram code, one Drive file and a Hebrew name', function () {
  const codes = new Set();
  const names = new Set();
  const legacyNames = new Set(drive.items.filter(function (e) { return REELS.indexOf(e) === -1; }).map(function (e) { return e.he; }));
  const otherReelCodes = new Set(reels.map(function (r) { return (String(r.source_url || r.url || '').match(/reel\/([^/]+)/) || [])[1]; }));
  REELS.forEach(function (e) {
    const m = e.sourceUrl.match(/^https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)\/$/);
    assert.ok(m, e.id + ' sourceUrl');
    assert.equal(codes.has(m[1]), false, 'duplicate reel ' + m[1]);
    codes.add(m[1]);
    assert.equal(otherReelCodes.has(m[1]), false, m[1] + ' already in data/exercises.json');
    assert.equal(names.has(e.he), false, 'duplicate name ' + e.he);
    names.add(e.he);
    assert.equal(legacyNames.has(e.he), false, e.he);
    assert.equal(youtube.items.some(function (y) { return y.he === e.he; }), false, e.he + ' collides with YouTube');
    assert.match(e.he, /[\u0590-\u05FF]/);
    assert.equal(e.id, 'drive_' + e.he.replace(/ /g, '_'));
    assert.ok(FOLDERS.has(e.folder), e.id + ' folder ' + e.folder);
    assert.equal(e.file, undefined, e.id + ' must not use a release file');
    assert.equal(e.drivePlayId, undefined);
    e.equipment.forEach(function (q) { assert.ok(EQUIPMENT.has(q), e.id + ' equipment ' + q); });
    assert.equal(e.equipment.indexOf('machine'), -1, e.id + ' machine-only reels stay out of the app');
    const dv = driveVideos.filter(function (v) { return v.fileId === e.driveId; });
    assert.equal(dv.length, 1, e.id + ' missing from data/drive_videos.json');
    assert.equal(dv[0].folder, 'כושר/' + e.folder);
    assert.equal(dv[0].name, e.he + ' - ' + m[1] + '.mp4');
  });
});

test('Drive-hosted reels play in the Drive player inside the merged library', function () {
  const merged = TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), youtube, []);
  TH.setCatalog(merged);
  REELS.forEach(function (e) {
    const row = merged[e.id];
    assert.ok(row, e.id + ' missing after merge');
    assert.equal(TH.playableKind(row), 'drive', e.id);
    const html = TH.mediaMarkup(row, { className: 'ex-media' });
    assert.match(html, new RegExp('drive\\.google\\.com/file/d/' + e.driveId + '/preview'));
    assert.doesNotMatch(html, /trainerhub-media-v1|<video/);
    const found = TH.findExercise({ name: e.he });
    assert.ok(found && found.driveId === e.driveId, e.he + ' not found by name');
  });
});
