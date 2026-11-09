'use strict';

// library.html filters the merged catalog (js/catalog.json + drive + YouTube)
// through TH.filterCatalog({ level }). Every level in that select must match
// at least one playable row, including advanced («מתקדמים»).

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

const LEVELS = ['beginner', 'intermediate', 'advanced'];

const ADVANCED_IDS = [
  ['catalog', 'mountain_climber'],
  ['catalog', 'מטפס_הרים_עם_פלאנק'],
  ['drive', 'drive_מטפס_הרים'],
  ['drive', 'drive_מטפס_הרים_עם_פלאנק'],
  ['youtube', 'yt_mountain_climber'],
  ['youtube', 'yt_arnold_press'],
  ['youtube', 'yt_burpee'],
  ['youtube', 'yt_one_arm_pushup'],
  ['youtube', 'yt_pistol_squat'],
  ['youtube', 'yt_wall_handstand'],
  ['youtube', 'yt_l_sit'],
  ['youtube', 'yt_nordic_curl']
];

const INTERMEDIATE_IDS = [
  ['catalog', 'הליכת_חיות_לחיזוק_ידיים'],
  ['drive', 'drive_הליכת_חיות_לחיזוק_ידיים'],
  ['youtube', 'yt_kb_swing'],
  ['youtube', 'yt_rdl_db'],
  ['youtube', 'yt_goblet_squat'],
  ['youtube', 'yt_diamond_pushup']
];

function byId(source, id) {
  if (source === 'catalog') return catalog[id];
  const list = source === 'drive' ? drive.items : youtube.items;
  return (list || []).find(function (item) { return item && item.id === id; });
}

// Same merge library.html runs in loadCatalog: local, then drive, then YouTube.
function libraryCatalog() {
  return TH.mergeCatalogs(TH.mergeCatalogs(catalog, drive, []), youtube, []);
}

test('each library level filter matches at least one exercise', function () {
  const merged = libraryCatalog();
  TH.setCatalog(merged);
  LEVELS.forEach(function (level) {
    const rows = TH.filterCatalog({ level: level });
    assert.ok(rows.length >= 1, level + ' filter is empty');
    rows.forEach(function (row) {
      assert.equal(row.level, level);
    });
  });
});

test('source-backed advanced and intermediate ids keep those levels', function () {
  ADVANCED_IDS.forEach(function (pair) {
    const entry = byId(pair[0], pair[1]);
    assert.ok(entry, pair[1] + ' missing from ' + pair[0]);
    assert.equal(entry.level, 'advanced', pair[1]);
  });
  INTERMEDIATE_IDS.forEach(function (pair) {
    const entry = byId(pair[0], pair[1]);
    assert.ok(entry, pair[1] + ' missing from ' + pair[0]);
    assert.equal(entry.level, 'intermediate', pair[1]);
  });
});

test('a beginner request still fills its main phase from the real catalog', function () {
  TH.setCatalog(catalog);
  ['אימון למתחילים', 'אימון בטן למתחילים 45 דקות', 'אימון גוף מלא 30 דקות למתחילים'].forEach(function (text) {
    const built = Engine.buildSession(text, catalog);
    assert.ok(built.workout, text + ': ' + (built.notice || 'no workout'));
    const main = built.workout.phases.find(function (ph) { return ph.name === 'Main'; });
    const need = Engine.wantedCount(built.request.duration, Engine.prescription(built.request));
    assert.ok(main.exercises.length >= Math.min(need, 2), text + ' main=' + main.exercises.length + ' need=' + need);
    assert.equal(built.request.level, 'beginner', text);
  });
});
