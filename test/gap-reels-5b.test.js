'use strict';

// Meta AI gap reels round 5, batches 3-6: each reel was
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
  'DaLTHvOPTWv', 'DcwnoAWom8H', 'DEqXGrHRECu', 'DashoeainRD', 'DbxzZPVKo6R', 'DeJ_A8WR2Tt',
  'De-wbR6OM-s', 'DQ4WX5AjPTM', 'DcLvNCzk7JE', 'DQhP1vnCEFb', 'DbdT_qTRDYf', 'DdXACV_BApE',
  'DPvzXwFEW-u', 'DUhU5gjkVA3', 'Ddg69cfCxIH', 'DZqqIkCgy_3', 'DVZbQGLkp3H', 'DW-cVLLE2bH',
  'DfNRDFXslAk', 'DVY9dlnCJpP', 'DbOxLzHAsvP', 'DO6uK6pgZoZ', 'DYQnQ6EJpEx', 'DY2nj0ehf1_',
  'DLkUntJhKP5', 'DehkvvXxH_0', 'DaNS6zXxQCv', 'DLaQlqCRbd7', 'DaTZT9bh4gy', 'DckJE7XsSg2',
  'Deu6X-xSXy1', 'DVVwl1XjUKH', 'DfVBX25M9e9', 'DRvestVCVA9', 'DfSLngFMl5I', 'Dd7Ar8AxeBk',
  'DWFs5LuiDwq', 'DS-cLnDCcBJ', 'DT4d8ZPjfwU', 'DdwMiMfsn0H', 'Da_7MxTNwFp', 'DH9Z1duSE_6',
  'DV1quogj_bN', 'DcLtULuNG5g', 'DapAAjEoF-o', 'DfHkcmPzO3T', 'DXRfwQlk2g2', 'DXJfIxjFHIW',
  'DX2aHRPyLWJ', 'DKKqZDmRs_j', 'DIeGEe_JTIB', 'DeEY999I8sl', 'DcEG0UoBgxu', 'DJouWQ1Kfof',
  'DVvzDuakWBk', 'Dc1hU3UKNYc', 'DcWieqzyUz8', 'DdvevHGtL-N', 'DcGPr-_Tahc', 'DZu5z53M9qa',
  'DTx0V5EDXc8', 'DfX1tqny6O_', 'DEFKAz5t8Yx', 'Dc_WiZPsGq3', 'DcP7-ZuOyJJ', 'DaP2doKszln',
  'DKCtSfxCLxt', 'DJUOT17OEQc', 'DY7kG-1KS4V'];

function row(code) {
  return drive.items.find(function (e) { return e.sourceUrl === 'https://www.instagram.com/reel/' + code + '/'; });
}

test('every round-5 batch 3-6 reel is a playable Drive row with a poster file and a Drive listing', function () {
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

test('band, bar, cone, dumbbell, stairs, tennis-ball, barbell and kettlebell cells gain real clips', function () {
  TH.setCatalog(merged);
  [[{ muscle: 'chest', equipment: 'band', level: 'advanced' }, 'DaLTHvOPTWv'],
    [{ muscle: 'core', equipment: 'bar', level: 'advanced' }, 'DQhP1vnCEFb'],
    [{ muscle: 'legs', equipment: 'cones', level: 'advanced' }, 'DVY9dlnCJpP'],
    [{ muscle: 'triceps', equipment: 'dumbbells', level: 'advanced' }, 'DfVBX25M9e9'],
    [{ muscle: 'chest', equipment: 'stairs', level: 'beginner' }, 'DWFs5LuiDwq'],
    [{ muscle: 'core', equipment: 'tennis-ball', level: 'beginner' }, 'DdwMiMfsn0H'],
    [{ muscle: 'biceps', equipment: 'barbell', level: 'advanced' }, 'DXRfwQlk2g2'],
    [{ muscle: 'shoulders', equipment: 'barbell', level: 'advanced' }, 'DEFKAz5t8Yx'],
    [{ muscle: 'back', equipment: 'kettlebell', level: 'advanced' }, 'DcP7-ZuOyJJ'],
    [{ muscle: 'biceps', equipment: 'kettlebell', level: 'advanced' }, 'DY7kG-1KS4V']].forEach(function (p) {
    assert.ok(TH.filterCatalog(p[0]).some(function (e) { return e.id === row(p[1]).id; }), JSON.stringify(p[0]));
  });
});
