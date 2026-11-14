'use strict';

// Meta AI gap reels round 5, batches 7-8 (kettlebell): each reel was
// downloaded and checked frame by frame, then hosted on Drive.
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

const CODES = [
  'DK0LwTbpeLR', 'DeZJGicy3uD', 'Dbbb_hWvkTE', 'DYSefxWyKvM', 'DdL_3vLRKHD', 'DT9Ag78DJP8',
  'Ddrvpw9qUY9', 'DOmUPaFClwd', 'DdR-glfSSQy', 'DJOyOQfRCnQ', 'DWbguFJh4OC', 'DK1BMZ1CoxI'];

function row(code) {
  return drive.items.find(function (e) { return e.sourceUrl === 'https://www.instagram.com/reel/' + code + '/'; });
}

test('every round-5 batch 7-8 reel is a playable Drive row with a poster file and a Drive listing', function () {
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

test('kettlebell chest and triceps cells gain real clips', function () {
  TH.setCatalog(merged);
  [[{ muscle: 'chest', equipment: 'kettlebell', level: 'advanced' }, 'DeZJGicy3uD'],
    [{ muscle: 'chest', equipment: 'kettlebell', level: 'beginner' }, 'DYSefxWyKvM'],
    [{ muscle: 'triceps', equipment: 'kettlebell', level: 'advanced' }, 'DOmUPaFClwd'],
    [{ muscle: 'triceps', equipment: 'kettlebell', level: 'beginner' }, 'DK1BMZ1CoxI']].forEach(function (p) {
    assert.ok(TH.filterCatalog(p[0]).some(function (e) { return e.id === row(p[1]).id; }), JSON.stringify(p[0]));
  });
});
