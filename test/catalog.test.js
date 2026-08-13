'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const catalogPath = path.join(__dirname, '..', 'js', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const REQUIRED = ['id', 'he', 'muscles', 'equipment', 'level', 'file'];
const LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const MUSCLES = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core']);
const PLACEHOLDER = /placeholder|todo|FIXME|lorem|dummy|example\.mp4|^video\.mp4$|^clip\.mp4$|xxx\.mp4/i;
const PERSONAL = /aviran|swissa|אבירן|אבירן|סוויסה|סויסה|avi[\s_-]?ran/i;

const entries = Object.entries(catalog);

test('catalog.json is a non-empty object of exercise records', function () {
  assert.equal(Array.isArray(catalog), false);
  assert.equal(typeof catalog, 'object');
  assert.ok(entries.length >= 20, 'catalog is too small to be the real clip library');
});

test('every catalog entry has id, he, muscles, equipment, level, and file', function () {
  const missing = [];
  for (const [key, entry] of entries) {
    assert.equal(typeof entry, 'object', key);
    for (const field of REQUIRED) {
      const value = entry[field];
      if (value == null || value === '') missing.push(key + '.' + field);
    }
    if (entry.id !== key) missing.push(key + ' id mismatch (' + entry.id + ')');
    if (typeof entry.he !== 'string' || !entry.he.trim()) missing.push(key + '.he empty');
    if (!Array.isArray(entry.muscles) || !entry.muscles.length) missing.push(key + '.muscles');
    if (!Array.isArray(entry.equipment) || !entry.equipment.length) missing.push(key + '.equipment');
    if (!LEVELS.has(entry.level)) missing.push(key + '.level=' + entry.level);
    for (const muscle of entry.muscles || []) {
      if (!MUSCLES.has(muscle)) missing.push(key + ' unknown muscle ' + muscle);
    }
  }
  assert.deepEqual(missing, []);
});

test('no catalog file path is a placeholder', function () {
  const bad = [];
  for (const [key, entry] of entries) {
    const file = String(entry.file || '');
    if (!file || PLACEHOLDER.test(file) || !/\.mp4$/i.test(file)) {
      bad.push(key + ' -> ' + JSON.stringify(file));
    }
    if (/^https?:\/\//i.test(file) || file.indexOf('about:') === 0) {
      bad.push(key + ' remote/placeholder url ' + file);
    }
  }
  assert.deepEqual(bad, []);
});

test('catalog entries do not use personal names as ids, titles, or files', function () {
  const hits = [];
  for (const [key, entry] of entries) {
    const blob = [key, entry.id, entry.he, entry.file].join(' ');
    if (PERSONAL.test(blob)) hits.push(blob);
  }
  assert.deepEqual(hits, []);
});

test('findExercise maps every catalog id and Hebrew name to that entry', function () {
  TH.setCatalog(catalog);
  for (const [id, entry] of entries) {
    const byId = TH.findExercise({ id: id });
    assert.ok(byId, 'missing id map for ' + id);
    assert.equal(byId.file, entry.file);
    assert.equal(byId.he, entry.he);
    const byHe = TH.findExercise({ name: entry.he });
    assert.ok(byHe, 'missing Hebrew map for ' + entry.he);
    assert.equal(byHe.he, entry.he);
  }
});

test('plan-engine ids that have a clip resolve; unknown ids do not invent a file', function () {
  TH.setCatalog(catalog);
  assert.equal(TH.findExercise({ id: 'plank' }).file, 'פלאנק.mp4');
  assert.equal(TH.findExercise({ id: 'crunches' }).file, 'בטן.mp4');
  assert.equal(TH.findExercise({ id: 'mountain_climber' }).file, 'מטפס הרים.mp4');
  assert.equal(TH.findExercise({ id: 'superman' }).file, 'גב תחתון.mp4');
  assert.equal(TH.findExercise({ name: 'מתח אוסטרלי' }).id, 'bodyweight_row');
  assert.equal(TH.findExercise({ id: 'this_exercise_does_not_exist' }), null);
  assert.equal(TH.heName('plank'), 'פלאנק');
  assert.equal(TH.catalogSrc('פלאנק.mp4').includes('videos/'), true);
});
