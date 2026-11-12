'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const local = read('js/catalog.json');
const drive = read('videos/drive-catalog.json');
const youtube = read('videos/youtube-catalog.json');
const driveVideos = read('data/drive_videos.json');

const REELS = [
  { he: 'שכיבות סמיכה על כדורי טניס', driveId: '1_F3xM_XRgQWBALb_G3rqN98uHgRmsB5M', file: 'thv-069.mp4', reel: 'DRiX3AEjJgz' },
  { he: 'כפיפת מרפק עם כדורגל', driveId: '1z8Gth3pUaJbGefXSA44GabrjNGRri-R6', file: 'thv-070.mp4', reel: 'DfcjXIZRiuW' },
  { he: 'כפיפת מרפק לילדים', driveId: '1qSJGdny04QFla6H4elLLjXFn-h3UoLpc', file: 'thv-071.mp4', reel: 'DV5gi5aiDuS' }
];

function setup() {
  TH.setCatalog(TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), youtube, []));
}

test('each Instagram reel is one playable hosted video with its Drive copy registered once', function () {
  setup();
  REELS.forEach(function (r) {
    const rows = drive.items.filter(function (e) { return e.he === r.he; });
    assert.equal(rows.length, 1, r.he);
    const row = rows[0];
    assert.equal(row.driveId, r.driveId);
    assert.equal(row.file, 'https://github.com/Swissystem7/TrainerHub/releases/download/trainerhub-media-v1/' + r.file);
    assert.equal(row.sourceUrl, 'https://www.instagram.com/reel/' + r.reel + '/');
    const hits = TH.catalogList().filter(function (e) { return e.he === r.he; });
    assert.equal(hits.length, 1, 'one library card for ' + r.he);
    assert.equal(TH.playableKind(hits[0]), 'file');
    const dv = driveVideos.filter(function (v) { return v.fileId === r.driveId; });
    assert.equal(dv.length, 1);
    assert.ok(dv[0].name.indexOf(r.he) === 0 && dv[0].name.endsWith(' - ' + r.reel + '.mp4'));
  });
});

test('the reels fill chest+tennis-ball, biceps+football and kids biceps in the library filters', function () {
  setup();
  const names = function (opts) {
    return TH.filterCatalog(opts).map(function (e) { return e.he; });
  };
  assert.ok(names({ muscle: 'chest', equipment: 'tennis-ball' }).indexOf('שכיבות סמיכה על כדורי טניס') !== -1);
  assert.ok(names({ muscle: 'biceps', equipment: 'football' }).indexOf('כפיפת מרפק עם כדורגל') !== -1);
  assert.ok(names({ muscle: 'biceps', tag: 'kids' }).indexOf('כפיפת מרפק לילדים') !== -1);
});

test('the water challenge stays without an invented video', function () {
  assert.equal(local['אתגר_שתייה'].available, false);
});
