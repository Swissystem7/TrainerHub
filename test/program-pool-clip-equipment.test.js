'use strict';

// The weekly builder (weekly.html) builds a «משקל גוף» / «גב» program from PROGRAM_POOL
// plus the catalog. bodyweight_row is listed in PROGRAM_POOL with equipment ['none'],
// but the catalog clip the trainee actually gets for that id is «מתח אוסטרלי»: a bar
// exercise, level intermediate, tagged dangerous. The clip's equipment must decide
// whether the exercise fits the chosen equipment, so a bodyweight beginner program
// never prescribes a bar exercise under the name «חתירת משקל גוף».

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));

function profile(overrides) {
  return Object.assign({
    age: 31, gender: 'other', fitnessLevel: 'beginner', goals: ['general_fitness'],
    availableEquipment: ['none'], targetMuscles: ['back'], injuries: [],
    previousWorkouts: 8, audience: '', preferCatalog: true
  }, overrides || {});
}

function mainIds(program) {
  return program.dailyWorkouts.reduce(function (acc, d) {
    return acc.concat(d.exercises.map(function (x) { return x.name; }));
  }, []);
}

test('catalog: bodyweight_row is a bar clip, so the test premise holds', function () {
  assert.equal(catalog.bodyweight_row.he, 'מתח אוסטרלי');
  assert.deepEqual(catalog.bodyweight_row.equipment, ['bar']);
  assert.notEqual(catalog.bodyweight_row.available, false);
});

test('a bodyweight back program never prescribes the bar clip bodyweight_row', function () {
  TH.setCatalog(catalog);
  for (const level of ['beginner', 'intermediate', 'advanced']) {
    for (const days of [1, 2, 3, 4, 5]) {
      const p = TH.generateWorkoutProgram(profile({ fitnessLevel: level }), 1, days);
      assert.ok(mainIds(p).indexOf('bodyweight_row') === -1,
        'level=' + level + ' days=' + days + ' got ' + mainIds(p).join(','));
    }
  }
});

test('a full-body bodyweight program (weekly.html default) never prescribes bodyweight_row', function () {
  TH.setCatalog(catalog);
  for (const eq of ['none', 'dumbbells', 'band', 'cones', 'ball']) {
    const p = TH.generateWorkoutProgram(profile({ targetMuscles: [], availableEquipment: [eq] }), 1, 3);
    assert.ok(mainIds(p).indexOf('bodyweight_row') === -1, 'equipment=' + eq + ' got ' + mainIds(p).join(','));
  }
});

test('with a bar available the clip is still eligible for a back day', function () {
  TH.setCatalog(catalog);
  const p = TH.generateWorkoutProgram(profile({ availableEquipment: ['bar'] }), 1, 1);
  assert.ok(mainIds(p).indexOf('bodyweight_row') !== -1, 'got ' + mainIds(p).join(','));
});

test('the bodyweight back program keeps its bodyweight clips', function () {
  TH.setCatalog(catalog);
  const p = TH.generateWorkoutProgram(profile(), 1, 1);
  const ids = mainIds(p);
  assert.ok(ids.length >= 2, 'got ' + ids.join(','));
  ids.forEach(function (id) {
    const entry = catalog[id];
    if (!entry) return;
    const eq = entry.equipment && entry.equipment.length ? entry.equipment : ['none'];
    assert.ok(eq.indexOf('none') !== -1, id + ' needs ' + eq.join(','));
  });
});

test('without a catalog the built-in list still treats bodyweight_row as bodyweight', function () {
  TH.setCatalog({});
  const p = TH.generateWorkoutProgram(profile({ preferCatalog: false }), 1, 1);
  assert.ok(mainIds(p).indexOf('bodyweight_row') !== -1, 'got ' + mainIds(p).join(','));
  TH.setCatalog(catalog);
});
