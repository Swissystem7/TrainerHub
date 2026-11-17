'use strict';

// Fifth batch of Meta AI gap reels (round 5, batches 1-2): each reel was
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

const CODES = ['DCiDTM4MPki', 'DdehFUAJ-5h', 'DUt8So-jbCP', 'Dc8dfEVDKRq', 'Danvg5gpuiR', 'DKsss4Jpst6',
  'DfPhR2JofeW', 'DaAVB_ggN1l', 'DZ8W6bMJh5V', 'DXlBDVSgPg3', 'Dbvwd2ShYNR', 'DfUMp1vziTw', 'DY4S7_yuk5Z',
  'DebGMYjRODK', 'Db_mNBLJecv', 'Ddh4G2ihXRk', 'Da9q3OeJdnr', 'Dc4EqUvvv_q', 'DciUxhkvyQM', 'DbDQEQPSPar',
  'DVeniyskoCm', 'DaShhJxxY0-', 'DZLKClvIWdB', 'DEQ2kTJusT4'];

function row(code) {
  return drive.items.find(function (e) { return e.sourceUrl === 'https://www.instagram.com/reel/' + code + '/'; });
}

test('every round-5 reel is a playable Drive row with a poster file and a Drive listing', function () {
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

test('thin ball/basketball/tennis-ball cells and kids upper-body levels gain real clips', function () {
  TH.setCatalog(merged);
  [[{ muscle: 'biceps', equipment: 'ball', level: 'beginner' }, 'DCiDTM4MPki'],
    [{ muscle: 'biceps', equipment: 'basketball', level: 'advanced' }, 'DUt8So-jbCP'],
    [{ muscle: 'back', equipment: 'tennis-ball', level: 'advanced' }, 'Danvg5gpuiR'],
    [{ muscle: 'back', equipment: 'ball', level: 'advanced' }, 'Db_mNBLJecv'],
    [{ muscle: 'back', tag: 'kids', level: 'advanced' }, 'DKsss4Jpst6'],
    [{ muscle: 'chest', tag: 'kids', level: 'advanced' }, 'DaAVB_ggN1l'],
    [{ muscle: 'chest', tag: 'kids', level: 'intermediate' }, 'DZ8W6bMJh5V'],
    [{ muscle: 'core', tag: 'kids', level: 'intermediate' }, 'DfUMp1vziTw']].forEach(function (p) {
    assert.ok(TH.filterCatalog(p[0]).some(function (e) { return e.id === row(p[1]).id; }), JSON.stringify(p[0]));
  });
});
