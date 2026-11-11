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
    'מתיחות וגמישות': 8,
    'כתפיים': 21,
    'חימום': 6,
    'יד קדמית': 13,
    'יד אחורית': 8,
    'רגליים': 21,
    'קרדיו': 11,
    'ידיים': 1,
    'בטן': 5,
    'גב': 8,
    'חזה': 12
  });
  assert.equal(youtube.items.length, 114);
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

test('each program-pool name with a video resolves through findExercise', function () {
  const merged = TH.mergeCatalogs(TH.mergeCatalogs(catalog, drive, []), youtube, []);
  TH.setCatalog(merged);
  const byYoutube = {
    bodyweight_squat: 'PlDqgNcJJ2U',
    lunges: 'M6DZ0Dca17w',
    glute_bridge: 'SKOMwg1JLrU',
    step_up: 'nhVyTCGGvS0',
    wall_sit: 'y-wV4Venusw',
    calf_raise: '3UWi44yN-wM',
    goblet_squat: 'Wr-f4vy8wTs',
    dumbbell_lunge: '3TM-vVWuLYE',
    romanian_deadlift_db: 'vnEANU7BqqY',
    squat: '-bJIpOq-LWk',
    deadlift: 'yPqv3ejnZvc',
    leg_press: 'oujca3_Shgw',
    push_up: 'WDIpL0pjun0',
    wide_push_up: 'rr6eFNNDQdU',
    dumbbell_bench: 'VmB1G1K7v94',
    dumbbell_fly: 'eozdVDA78K0',
    bench_press: 'rT7DgCr-3pg',
    dumbbell_row: '-koP10y1qZI',
    barbell_row: '9efgcAjQe7E',
    pull_up: '9yVGh3XbJ34',
    lat_pulldown: 'GL3h256d6JM',
    pike_push_up: '18mNeuH4D1k',
    arm_circles: 'oLB8i4bC3Zk',
    dumbbell_ohp: 'qEwKCR5JCog',
    lateral_raise: 'WPAOe6yBONA',
    overhead_press: '2yjwXTZQDDI',
    bodyweight_curl: 'F5hCRqcDOMI',
    bicep_curl: 'uO_CNYidOw0',
    hammer_curl: 'SGolzLoGutg',
    bench_dips: 'c3ZGl4pAwZ4',
    tricep_push_up: 'nOIcUZMwzgM',
    overhead_extension: 'b_r_LW4HEcM',
    tricep_pushdown: 'UKsqwz1OSWw',
    russian_twist: 'wkD8rjkodUI',
    leg_raise: '0tzBVqiDwSs'
  };
  const byFile = ['superman', 'bodyweight_row', 'plank', 'crunches', 'mountain_climber'];
  Object.keys(byYoutube).concat(byFile).forEach(function (id) {
    const he = TH.heName(id);
    const hit = TH.findExercise({ id: id, name: he });
    assert.ok(hit && TH.isPlayable(hit), id + ' / ' + he);
    const byId = TH.findExercise({ id: id });
    assert.equal(byId && byId.id, hit.id, id);
    if (byYoutube[id]) assert.equal(hit.youtubeId, byYoutube[id], id);
  });
  assert.equal(TH.findExercise({ id: 'step_up' }).id, 'step_up');
  assert.equal(TH.findExercise({ id: 'step_up' }).youtubeId, 'nhVyTCGGvS0');
  assert.equal(TH.findExercise({ id: 'dumbbell_step_up' }).youtubeId, 'DxUNi119Qzs');
  assert.equal(TH.matchCatalog('שכיבות סמיכה').youtubeId, 'WDIpL0pjun0');
  assert.equal(TH.matchCatalog('סקוואט').id, 'squat');
  assert.notEqual(TH.matchCatalog('סקוואט').id, 'yt_pistol_squat');
  assert.equal(TH.matchCatalog('דדליפט').id, 'deadlift');
  assert.notEqual(TH.matchCatalog('דדליפט').id, 'yt_rdl_db');
  assert.equal(TH.matchCatalog('פרפר הפוך').id, 'yt_rear_delt_fly');
  assert.equal(TH.findExercise({ id: 'reverse_fly_bw', name: 'פרפר הפוך משקל גוף' }).youtubeId, 'BpbZC_Pd4XU');
  assert.equal(TH.matchCatalog('אדמה בוערת').id, 'fast_feet');
  assert.equal(TH.matchCatalog('אדמה בוערת').youtubeId, 'eT5M1goPDhY');
  assert.notEqual(TH.matchCatalog('אדמה בוערת').id, 'mountain_climber');
  assert.equal(TH.matchCatalog('שכיבות סמיכה בהתקדמות').youtubeId, 'l7ZmX1eaXLo');
  assert.equal(TH.matchCatalog('ניתורים במקום עם ברכיים לחזה').id, 'tuck_jump');
  assert.equal(TH.matchCatalog('הליכה על הידיים').id, 'hand_walk_out');
  assert.equal(TH.matchCatalog('ניתור לאדמה וגלגול').id, 'sprawl');
  assert.equal(TH.matchCatalog('זריקות כדור כוח מעל הראש').id, 'med_ball_overhead_throw');
  assert.equal(TH.matchCatalog('צעדי איילה').id, 'agility_5_10_5');
  assert.equal(TH.matchCatalog('australian pull-up').id, 'bodyweight_row');
  assert.equal(merged.yt_hand_release_push_up.youtubeId, 'dFI0VWMqxIk');
  assert.equal(youtube.items.some(function (item) { return item.youtubeId === 'BsZnGeTL1Sc'; }), false);
  assert.equal(youtube.items.some(function (item) { return item.youtubeId === '9mO6ygDS7y4'; }), false);
  assert.equal(TH.findExercise({ id: 'אתגר_שתייה' }), null);
});
