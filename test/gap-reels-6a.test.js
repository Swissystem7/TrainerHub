'use strict';

// Meta AI gap reels round 6, batches 1-5 (kids, ball, band, bar, cones, dumbbells, kettlebell, stairs, tennis ball): each reel was
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
  'Dfbt3s5RTxZ', 'DcYsqryNdp0', 'De0rt6RN3V9', 'DYzjR6Oxgqi', 'DKwg6STzp_8', 'DfqP_mBqnAO', 'DNRebNpgS5f',
  'DWT2TgzjWPF', 'DNQziffMVDK', 'DevhdVtPvpF', 'De2JQriIB4p', 'DZzQHoAq-1M', 'DWEKsXCBSb8', 'DbVjLqnSG72',
  'DUIPy77CHbw', 'DfI-KGXSxpI', 'DKAgajIudiu'];

function row(code) {
  return drive.items.find(function (e) { return e.sourceUrl === 'https://www.instagram.com/reel/' + code + '/'; });
}

test('every round-6 reel is a playable Drive row with a poster file and a Drive listing', function () {
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

test('bar, band, ball, cones and dumbbell cells gain real clips', function () {
  TH.setCatalog(merged);
  [[{ muscle: 'shoulders', equipment: 'bar', level: 'advanced' }, 'De2JQriIB4p'],
    [{ muscle: 'chest', equipment: 'bar', level: 'beginner' }, 'DNQziffMVDK'],
    [{ muscle: 'core', equipment: 'bar', level: 'beginner' }, 'DevhdVtPvpF'],
    [{ muscle: 'biceps', equipment: 'ball', level: 'advanced' }, 'DfqP_mBqnAO'],
    [{ muscle: 'legs', equipment: 'band', level: 'advanced' }, 'DNRebNpgS5f'],
    [{ muscle: 'core', equipment: 'cones', level: 'advanced' }, 'DWEKsXCBSb8'],
    [{ muscle: 'shoulders', equipment: 'dumbbells', level: 'beginner' }, 'DbVjLqnSG72'],
    [{ muscle: 'chest', equipment: 'stairs', level: 'advanced' }, 'DfI-KGXSxpI'],
    [{ muscle: 'legs', equipment: 'tennis-ball', level: 'advanced' }, 'DKAgajIudiu']].forEach(function (p) {
    assert.ok(TH.filterCatalog(p[0]).some(function (e) { return e.id === row(p[1]).id; }), JSON.stringify(p[0]));
  });
});
