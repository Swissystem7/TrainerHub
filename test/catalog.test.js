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

test('available catalog videos use the verified public media mirror', function () {
  const bad = [];
  for (const [key, entry] of entries) {
    const file = String(entry.file || '');
    if (!file || PLACEHOLDER.test(file) || !/\.mp4$/i.test(file)) {
      bad.push(key + ' -> ' + JSON.stringify(file));
    }
    if (entry.available !== false && !/^https:\/\/github\.com\/Swissystem7\/TrainerHub\/releases\/download\/trainerhub-media-v1\/thv-\d{3}\.mp4$/i.test(file)) {
      bad.push(key + ' unverified media url ' + file);
    }
  }
  assert.deepEqual(bad, []);
  assert.equal(entries.filter(function (row) { return row[1].available !== false; }).length, 70);
  assert.equal(entries.filter(function (row) { return row[1].available === false; }).length, 8);
});

test('catalog entries do not use personal names as ids, titles, or files', function () {
  const hits = [];
  for (const [key, entry] of entries) {
    const blob = [key, entry.id, entry.he, entry.file].join(' ');
    if (PERSONAL.test(blob)) hits.push(blob);
  }
  assert.deepEqual(hits, []);
});

test('findExercise maps every available catalog id and leaves missing files unavailable', function () {
  TH.setCatalog(catalog);
  for (const [id, entry] of entries) {
    const byId = TH.findExercise({ id: id });
    if (entry.available === false) {
      assert.equal(byId, null, 'unavailable entry must not be selected: ' + id);
      continue;
    }
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
  assert.match(TH.findExercise({ id: 'plank' }).file, /trainerhub-media-v1\/thv-\d{3}\.mp4$/);
  assert.match(TH.findExercise({ id: 'crunches' }).file, /trainerhub-media-v1\/thv-\d{3}\.mp4$/);
  assert.match(TH.findExercise({ id: 'mountain_climber' }).file, /trainerhub-media-v1\/thv-\d{3}\.mp4$/);
  assert.match(TH.findExercise({ id: 'superman' }).file, /trainerhub-media-v1\/thv-\d{3}\.mp4$/);
  assert.equal(TH.findExercise({ name: 'מתח אוסטרלי' }).id, 'bodyweight_row');
  assert.equal(TH.findExercise({ id: 'this_exercise_does_not_exist' }), null);
  assert.equal(TH.heName('plank'), 'פלאנק');
  assert.equal(TH.catalogSrc(TH.findExercise({ id: 'plank' }).file), TH.findExercise({ id: 'plank' }).file);
});

/* ── Round-2 item 5: the catalogue draws from the repository's own enumerations ──
   The three constrained sets are the key sets of MUSCLE_LABELS, EQ_LABELS and
   LEVEL_LABELS in js/infer.js, read here directly so the test and the checker
   cannot drift apart. The entry count (78) is the one honesty.test.js already
   pins. When an entry is wrong the checker names it, so the assertion below
   prints the offending entries instead of only failing. */

const Analyzer = require('../js/analyzer.js');
const Infer = require('../js/infer.js');

test('every catalog entry draws its muscles, equipment and level from the enumerations', function () {
  const report = Analyzer.checkCatalogTaxonomy(catalog);
  assert.deepEqual(report.problems, [], 'catalog entries outside the enumerations');
  assert.equal(report.ok, true);
  assert.equal(report.total, 78);
  assert.deepEqual(report.vocabulary.muscles, Object.keys(Infer.MUSCLE_LABELS));
  assert.deepEqual(report.vocabulary.equipment, Object.keys(Infer.EQ_LABELS));
  assert.deepEqual(report.vocabulary.levels, Object.keys(Infer.LEVEL_LABELS));
  assert.deepEqual(report.vocabulary.muscles,
    ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core']);
  assert.deepEqual(report.vocabulary.levels, ['beginner', 'intermediate', 'advanced']);
  assert.equal(report.vocabulary.equipment.length, 15);
});

test('the taxonomy checker names every offending entry rather than only failing', function () {
  const broken = {
    good: { id: 'good', he: 'טוב', muscles: ['core'], equipment: ['none'], level: 'beginner' },
    typo_muscle: { id: 'typo_muscle', he: 'שריר', muscles: ['abs'], equipment: ['none'], level: 'beginner' },
    typo_equipment: { id: 'typo_equipment', he: 'ציוד', muscles: ['legs'], equipment: ['kettlebell'], level: 'beginner' },
    typo_level: { id: 'typo_level', he: 'רמה', muscles: ['legs'], equipment: ['none'], level: 'pro' },
    empty_lists: { id: 'empty_lists', he: 'ריק', muscles: [], equipment: ['none'], level: 'beginner' },
    wrong_key: { id: 'other_id', he: 'מזהה', muscles: ['core'], equipment: ['none'], level: 'beginner' }
  };
  const report = Analyzer.checkCatalogTaxonomy(broken);
  assert.equal(report.ok, false);
  assert.equal(report.total, 6);
  assert.deepEqual(report.problems.map(function (row) { return [row.id, row.field, row.value]; }), [
    ['typo_muscle', 'muscles', 'abs'],
    ['typo_equipment', 'equipment', 'kettlebell'],
    ['typo_level', 'level', 'pro'],
    ['empty_lists', 'muscles', []],
    ['wrong_key', 'id', 'other_id']
  ]);
  for (const row of report.problems) {
    assert.ok(row.he.indexOf(row.id) !== -1, 'a problem must name its entry: ' + row.he);
  }
  assert.deepEqual(Analyzer.checkCatalogTaxonomy(null).problems.map(function (r) { return r.field; }),
    ['catalog']);
});
