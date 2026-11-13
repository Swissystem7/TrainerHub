'use strict';

// Fourth batch of Meta AI gap reels (round 3): each was downloaded and checked
// frame by frame, then hosted on Drive.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const drive = read('videos/drive-catalog.json');
const driveVideos = read('data/drive_videos.json');
const merged = TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), drive, []), read('videos/youtube-catalog.json'), []);

const CODES = ['Db_KYjmOcgn', 'DP2AwGxkfbt', 'DdwNbDRMmiR', 'DcquXdnhkvV', 'DcSRPSEN4Q4'];

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

test('advanced band legs and dumbbell back cells get a real clip; kids legs gains an intermediate clip', function () {
  TH.setCatalog(merged);
  [[{ muscle: 'legs', equipment: 'band', level: 'advanced' }, 'Db_KYjmOcgn'],
    [{ muscle: 'back', equipment: 'dumbbells', level: 'advanced' }, 'DP2AwGxkfbt'],
    [{ muscle: 'legs', tag: 'kids', level: 'intermediate' }, 'DcquXdnhkvV']].forEach(function (p) {
    assert.ok(TH.filterCatalog(p[0]).some(function (e) { return e.id === row(p[1]).id; }), JSON.stringify(p[0]));
  });
});

test('single-leg RDL and band-assisted dips show their illustration', function () {
  ['DfZFgYmtAlg', 'DewMmR1g_fK'].forEach(function (c) {
    const e = row(c);
    assert.equal(e.poster, 'assets/posters/ill-' + e.driveId + '.jpg');
    assert.ok(fs.existsSync(path.join(root, e.poster)));
    assert.equal(driveVideos.find(function (v) { return v.fileId === e.driveId; }).poster, e.poster);
  });
});
