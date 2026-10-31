'use strict';

// The weekly builder kept only the designated «חימום» clip out of its pool.
// With «קונוסים» it opened day 1 with «חימום שכיבות שמיכה קונוסים על הגב» as
// 4 x 4-6 strength work, and «החלף…» still offered the warm-up drills.

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const catalog = require('../js/catalog.json');

TH.setCatalog(catalog);

function profile(equipment) {
  return {
    age: 31, gender: 'other', fitnessLevel: 'beginner', goals: ['strength'],
    availableEquipment: [equipment], targetMuscles: [], injuries: [],
    previousWorkouts: 8, audience: '', preferCatalog: true
  };
}

test('weekly days with cones keep the warm-up drills out of Main', function () {
  const program = TH.generateWorkoutProgram(profile('cones'), 1, 3);
  program.dailyWorkouts.forEach(function (day) {
    const main = TH.toPhasesWorkout(day, {}).phases[1].exercises;
    assert.ok(main.length, 'day has Main exercises');
    main.forEach(function (ex) {
      assert.doesNotMatch(ex.name, /חימום/, ex.name + ' is a warm-up drill in Main');
    });
  });
});

test('«החלף…» does not offer a warm-up drill for a Main exercise', function () {
  const subs = TH.substitutesFor({ id: 'אתגר_שכיבות_שמיכה' }, { equipment: ['cones'] }) || [];
  assert.ok(subs.length, 'has alternatives');
  subs.forEach(function (e) {
    assert.doesNotMatch(String(e.he || e.name || ''), /חימום/);
  });
});
