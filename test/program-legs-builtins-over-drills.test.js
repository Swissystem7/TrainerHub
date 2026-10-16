'use strict';

// A bodyweight «רגליים» program from weekly.html had no squat, lunge or glute bridge:
// the catalog has no clip for them, and preferClips kept only clipped candidates, so
// every leg slot went to catalog drills tagged legs («מסירות דיוק», «תרגיל תגובה»,
// «קורדינאציה», «פסים», «יציאה מהמקום»). When none of the built-in exercises for a slot
// has a clip they now come first; a muscle whose built-ins have clips (core: plank,
// mountain climber, crunches) still prefers the clips.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const TH = require('../js/core.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
const LEG_STAPLES = ['bodyweight_squat', 'lunges', 'glute_bridge', 'wall_sit', 'calf_raise', 'step_up'];
const DRILLS = ['מסירות_דיוק', 'תרגיל_תגובה', 'קורדינאציה', 'פסים', 'יציאה_מהמקום', 'מעגל_מעגל'];

function program(overrides) {
  TH.setCatalog(catalog);
  return TH.generateWorkoutProgram(Object.assign({
    age: 31, fitnessLevel: 'intermediate', goals: ['general_fitness'],
    availableEquipment: ['none'], targetMuscles: ['legs'], injuries: [],
    previousWorkouts: 8, audience: '', preferCatalog: true
  }, overrides || {}), 1, 3);
}

test('bodyweight legs program is built from squats, lunges and bridges, not ball drills', function () {
  program().dailyWorkouts.forEach(function (day) {
    const names = day.exercises.map(function (x) { return x.name; });
    assert.equal(names.length, 5, names.join(','));
    names.forEach(function (name) {
      assert.ok(LEG_STAPLES.indexOf(name) !== -1, 'day ' + day.day + ' got drill ' + name + ' in ' + names.join(','));
    });
  });
});

test('advanced legs day fills its sixth slot after the staples run out', function () {
  const names = program({ fitnessLevel: 'advanced' }).dailyWorkouts[0].exercises.map(function (x) { return x.name; });
  assert.equal(names.length, 6, names.join(','));
  assert.ok(names.indexOf('bodyweight_squat') !== -1, names.join(','));
});

test('core program still prefers the catalog clips', function () {
  program({ targetMuscles: ['core'] }).dailyWorkouts.forEach(function (day) {
    day.exercises.forEach(function (x) {
      assert.ok(TH.hasClip({ id: x.name, name: x.name }), 'clip-less core exercise ' + x.name);
    });
  });
});

test('ball drills never displace the staples on a legs day', function () {
  const names = program({ fitnessLevel: 'beginner' }).dailyWorkouts[0].exercises.map(function (x) { return x.name; });
  DRILLS.forEach(function (id) { assert.equal(names.indexOf(id), -1, id + ' in ' + names.join(',')); });
});
