'use strict';

// The program builder gave every exercise the goal's rep range, so a «ליבה» day
// read «פלאנק · 3 סטים · 12-15 חזרות» and workout-mode waited for plank reps.
// Static holds are now prescribed in seconds per set; moving drills keep reps.

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');

function mainExercises(profile) {
  const program = TH.generateWorkoutProgram(Object.assign({
    fitnessLevel: 'advanced', availableEquipment: ['none'], injuries: [],
    previousWorkouts: 8, preferCatalog: true
  }, profile), 1, 3);
  const out = [];
  program.dailyWorkouts.forEach(function (day) {
    const main = day.phases.filter(function (p) { return p.name === 'Main'; })[0];
    main.exercises.forEach(function (ex) { out.push(ex); });
  });
  return out;
}

test('a built-in plank / wall sit gets hold seconds, not the rep range', function () {
  TH.setCatalog({});
  const exs = mainExercises({ goals: ['endurance'], targetMuscles: ['core', 'legs'] });
  const holds = exs.filter(function (ex) { return ex.id === 'plank' || ex.id === 'wall_sit'; });
  assert.ok(holds.length > 0, 'expected a plank or wall sit in a core + legs program');
  holds.forEach(function (ex) {
    assert.equal(ex.reps, null, ex.name);
    assert.equal(ex.duration_seconds, 45, ex.name);
    assert.equal(ex.sets, 3, ex.name);
  });
  exs.filter(function (ex) { return holds.indexOf(ex) === -1; }).forEach(function (ex) {
    assert.equal(ex.reps, '12-15', ex.name);
    assert.equal(ex.duration_seconds, null, ex.name);
  });
});

test('the hold length follows the goal', function () {
  TH.setCatalog({});
  const strength = mainExercises({ goals: ['strength'], targetMuscles: ['core'] })
    .filter(function (ex) { return ex.id === 'plank'; });
  assert.ok(strength.length > 0);
  strength.forEach(function (ex) {
    assert.equal(ex.duration_seconds, 30);
    assert.equal(ex.sets, 4);
    assert.equal(ex.reps, null);
  });
});

test('catalog planks are holds, «מטפס הרים עם פלאנק» keeps reps', function () {
  const clip = function (he) {
    return { he: he, muscles: ['core'], equipment: ['none'], file: 'https://example.com/' + encodeURIComponent(he) + '.mp4', available: true };
  };
  TH.setCatalog({
    'פלאנק_צידי': clip('פלאנק צידי'),
    'פלאנק_ברכיים': clip('פלאנק ברכיים'),
    'מטפס_הרים_עם_פלאנק': clip('מטפס הרים עם פלאנק'),
    'כפיפות_בטן': clip('כפיפות בטן')
  });
  const exs = mainExercises({ goals: ['hypertrophy'], targetMuscles: ['core'] });
  const byId = {};
  exs.forEach(function (ex) { byId[ex.id] = ex; });
  ['פלאנק_צידי', 'פלאנק_ברכיים'].forEach(function (id) {
    assert.ok(byId[id], id + ' picked');
    assert.equal(byId[id].reps, null, id);
    assert.equal(byId[id].duration_seconds, 40, id);
  });
  ['מטפס_הרים_עם_פלאנק', 'כפיפות_בטן'].forEach(function (id) {
    assert.ok(byId[id], id + ' picked');
    assert.equal(byId[id].reps, '8-12', id);
    assert.equal(byId[id].duration_seconds, null, id);
  });
  TH.setCatalog({});
});
