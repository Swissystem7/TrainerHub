'use strict';

// «החלף…» in weekly.html (TH.swapExercise) and the «החלף» panel in workout-mode
// (TH.swapExerciseById) both go through applySwap, which kept the old exercise's
// reps. Swapping «שכיבות סמיכה · 3 × 8-12» for a plank gave «פלאנק · 8-12 חזרות»
// and workout-mode waited for reps on a static hold, while the program builder
// itself prescribes planks in seconds (isHoldExercise).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const TH = require('../js/core.js');

const REAL_CATALOG = require(path.join('..', 'js', 'catalog.json'));

function workoutWith(ex) {
  return { title: 't', phases: [{ name: 'Warm-up', exercises: [] }, { name: 'Main', exercises: [ex] }] };
}

function rep(reps) {
  return { name: 'סקוואט', id: 'squats', sets: 3, reps: reps, duration_seconds: null, rest_seconds: 60, notes: null };
}

test('swapping a rep exercise for a plank turns the reps into a hold', function () {
  TH.setCatalog(REAL_CATALOG);
  ['plank', 'פלאנק_צידי'].forEach(function (id) {
    const ex = TH.swapExercise(workoutWith(rep('8-12')), 1, 0, id).phases[1].exercises[0];
    assert.equal(ex.id, id);
    assert.equal(ex.reps, null, id);
    assert.equal(ex.duration_seconds, 40, id);
    assert.equal(ex.sets, 3);
    assert.equal(ex.rest_seconds, 60);
  });
});

test('the hold follows the goal the reps came from', function () {
  TH.setCatalog(REAL_CATALOG);
  assert.equal(TH.swapExercise(workoutWith(rep('4-6')), 1, 0, 'plank').phases[1].exercises[0].duration_seconds, 30);
  assert.equal(TH.swapExercise(workoutWith(rep('12-15')), 1, 0, 'plank').phases[1].exercises[0].duration_seconds, 45);
  assert.equal(TH.swapExercise(workoutWith(rep(10)), 1, 0, 'plank').phases[1].exercises[0].duration_seconds, 40);
});

test('workout-mode swap by id holds the plank too', function () {
  TH.setCatalog(REAL_CATALOG);
  const ex = TH.swapExerciseById(workoutWith(rep('8-12')), 'squats', 'plank').phases[1].exercises[0];
  assert.equal(ex.reps, null);
  assert.equal(ex.duration_seconds, 40);
});

test('a timed plank swapped for another plank keeps its seconds; rep swaps keep reps', function () {
  TH.setCatalog(REAL_CATALOG);
  const timed = { name: 'פלאנק', id: 'plank', sets: 3, reps: null, duration_seconds: 45, rest_seconds: 45, notes: null };
  const side = TH.swapExercise(workoutWith(timed), 1, 0, 'פלאנק_צידי').phases[1].exercises[0];
  assert.equal(side.duration_seconds, 45);
  assert.equal(side.reps, null);
  const other = Object.keys(REAL_CATALOG).filter(function (id) { return id !== 'squats' && !/פלאנק|plank|wall_sit/.test(id); })[0];
  const swapped = TH.swapExercise(workoutWith(rep('8-12')), 1, 0, other).phases[1].exercises[0];
  assert.equal(swapped.reps, '8-12');
  assert.equal(swapped.duration_seconds, null);
});
