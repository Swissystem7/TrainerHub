'use strict';

// YouTube fills are embeds only: a youtubeId on the catalog row, never a
// downloaded file. session-builder asks TH.isPlayable, which is true when a
// row has a file, a driveId, or a youtubeId and is not marked unavailable.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const Engine = require('../js/session-builder.js');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
const drive = JSON.parse(fs.readFileSync(path.join(root, 'videos', 'drive-catalog.json'), 'utf8'));
const youtube = JSON.parse(fs.readFileSync(path.join(root, 'videos', 'youtube-catalog.json'), 'utf8'));
const YT = /^[A-Za-z0-9_-]{11}$/;

const GAPS = {
  'עבודה_עם_יד_אחת': 'NubSSALIqsU',
  'בטן_גומיות': 'eVXtFHa1g_c',
  'בטן_זוגות_2': '6cnP5Xk_RLg',
  'בטן_עם_כדור': 'ZjkeaLU_gIM',
  'פלאנק_שעון': 'g6i5FokCR-I',
  'יציאה_מהמקום_2': 'pqpiHeNh1OY',
  'step_up': 'nhVyTCGGvS0'
};

function mainIds(built) {
  assert.ok(built.workout, built.notice || 'no workout');
  const main = built.workout.phases.find(function (ph) { return ph.name === 'Main'; });
  return main.exercises.map(function (ex) { return ex.id; });
}

test('the seven catalog gaps now have a playable YouTube video', function () {
  Object.keys(GAPS).forEach(function (id) {
    const entry = catalog[id];
    assert.ok(entry, id);
    assert.equal(entry.youtubeId, GAPS[id], id);
    assert.equal(entry.available, true, id);
    assert.equal(TH.isPlayable(entry), true, id + ' hasVideo');
    assert.equal(TH.playableKind(entry), 'youtube', id);
    const html = TH.mediaMarkup(entry, { className: 'ex-media' });
    assert.match(html, new RegExp('https://www.youtube.com/embed/' + GAPS[id]));
    assert.doesNotMatch(html, /<video/);
    const ids = mainIds(Engine.buildSession('אימון 20 דקות', [entry]));
    assert.ok(ids.indexOf(id) !== -1, id + ' left out of the session: ' + ids.join(','));
  });
});

test('אתגר שתייה is left without an invented video', function () {
  const entry = catalog['אתגר_שתייה'];
  assert.equal(entry.he, 'אתגר שתייה');
  assert.equal(entry.available, false);
  assert.equal(entry.youtubeId, undefined);
  assert.equal(TH.isPlayable(entry), false);
  const built = Engine.buildSession('אימון 20 דקות', [entry]);
  assert.equal(built.workout, null);
});

test('advanced youtube rows keep their aliases searchable in the library', function () {
  const merged = TH.mergeCatalogs(TH.mergeCatalogs(catalog, drive, []), youtube, []);
  TH.setCatalog(merged);
  const expectId = {
    'one arm push up': 'yt_one_arm_pushup',
    'pistol squat': 'yt_pistol_squat',
    'handstand': 'yt_wall_handstand',
    'אל סיט': 'yt_l_sit',
    'l sit': 'yt_l_sit',
    'nordic hamstring curl': 'yt_nordic_curl'
  };
  Object.keys(expectId).forEach(function (q) {
    const rows = TH.filterCatalog({ q: q });
    assert.ok(rows.some(function (row) { return row.id === expectId[q]; }), q + ' -> ' + rows.map(function (row) { return row.id; }).join(','));
    assert.equal(TH.matchCatalog(q).id, expectId[q], q);
  });
  ['yt_one_arm_pushup', 'yt_pistol_squat', 'yt_wall_handstand', 'yt_l_sit', 'yt_nordic_curl'].forEach(function (id) {
    assert.equal(merged[id].level, 'advanced', id);
    assert.equal(merged[id].source, 'youtube', id);
  });
  assert.deepEqual(merged.yt_wall_handstand.equipment, ['wall']);
  assert.deepEqual(merged.yt_l_sit.equipment, ['none']);
  assert.deepEqual(merged.yt_l_sit.muscles, ['core']);
  assert.deepEqual(merged.yt_nordic_curl.equipment, ['none']);
  assert.equal(Object.prototype.hasOwnProperty.call(merged.yt_nordic_curl, 'notes'), false);
});

test('youtubeIds are 11-character ids and unique across both catalogs', function () {
  const ids = [];
  Object.keys(catalog).forEach(function (id) {
    const yt = catalog[id].youtubeId;
    if (!yt) return;
    assert.match(yt, YT, id);
    ids.push(yt);
  });
  assert.equal(youtube._meta && youtube._meta.source, 'youtube');
  assert.equal(youtube.items.length, youtube._meta.count);
  youtube.items.forEach(function (item) {
    assert.match(item.youtubeId, YT, item.id);
    assert.equal(item.source, 'youtube');
    assert.notEqual(item.available, false, item.id);
    (item.equipment || []).forEach(function (eq) {
      assert.equal(Object.prototype.hasOwnProperty.call(TH.EQ_LABELS, eq), true, item.id + ' ' + eq);
    });
    ids.push(item.youtubeId);
  });
  assert.equal(new Set(ids).size, ids.length, 'duplicate youtubeId');
  assert.equal(ids.filter(function (id) { return id === 'nhVyTCGGvS0'; }).length, 1);
});

test('thin-group embeds join the library merge and the session builder', function () {
  const counts = {};
  youtube.items.forEach(function (item) {
    counts[item.folder] = (counts[item.folder] || 0) + 1;
  });
  assert.deepEqual(counts, {
    'מתיחות וגמישות': 6,
    'כתפיים': 15,
    'חימום': 6,
    'יד קדמית': 10,
    'יד אחורית': 6,
    'רגליים': 8,
    'קרדיו': 5,
    'ידיים': 1,
    'בטן': 2,
    'גב': 5
  });
  assert.equal(youtube.items.length, 64);
  const merged = TH.mergeCatalogs(TH.mergeCatalogs(catalog, drive, []), youtube, []);
  assert.equal(Object.keys(merged).length, Object.keys(catalog).length + youtube.items.length);
  youtube.items.forEach(function (item) {
    assert.equal(merged[item.id].youtubeId, item.youtubeId, item.id);
    assert.equal(TH.isPlayable(merged[item.id]), true, item.id);
    assert.equal(merged[item.id].folder, item.folder, item.id);
  });

  const shoulders = youtube.items.filter(function (item) { return item.folder === 'כתפיים'; });
  mainIds(Engine.buildSession('אימון כתפיים 30 דקות', shoulders)).forEach(function (id) {
    assert.ok(shoulders.some(function (item) { return item.id === id; }), id);
  });

  const arms = youtube.items.filter(function (item) {
    return item.folder === 'יד קדמית' || item.folder === 'יד אחורית';
  });
  mainIds(Engine.buildSession('אימון ידיים 30 דקות', arms)).forEach(function (id) {
    const item = arms.find(function (row) { return row.id === id; });
    assert.ok(item, id);
    assert.ok(item.muscles.indexOf('biceps') !== -1 || item.muscles.indexOf('triceps') !== -1, id);
  });

  const driveRaw = fs.readFileSync(path.join(root, 'data', 'drive_videos.json'), 'utf8');
  assert.equal(driveRaw.indexOf('youtube.com'), -1);
  assert.equal(driveRaw.indexOf('youtubeId'), -1);
  assert.match(fs.readFileSync(path.join(root, 'js', 'core.js'), 'utf8'), /videos\/youtube-catalog\.json/);
});
