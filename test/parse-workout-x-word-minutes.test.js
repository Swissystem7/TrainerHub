'use strict';

// Regression: «פלאנק 3x חצי דקה» came out as one 30 s set of an exercise named
// «פלאנק 3x» - the «Nx before a time» branch only looked for a digit after the x,
// so a minute written as a word kept the «3x» in the name and lost the 3 sets.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

function brief(e) {
  return { name: e.name, sets: e.sets, reps: e.reps, seconds: e.duration_seconds };
}

test('«Nx» before a minute written as a word is N timed sets', () => {
  assert.deepEqual(brief(main('פלאנק 3x חצי דקה')[0]),
    { name: 'פלאנק', sets: 3, reps: null, seconds: 30 });
  assert.deepEqual(brief(main('פלאנק 3 x דקה')[0]),
    { name: 'פלאנק', sets: 3, reps: null, seconds: 60 });
  assert.deepEqual(brief(main('ריצה 4×דקה וחצי')[0]),
    { name: 'ריצה', sets: 4, reps: null, seconds: 90 });
});

test('the rest after it is still the rest', () => {
  const ex = main('פלאנק 3x חצי דקה מנוחה 20 שניות')[0];
  assert.deepEqual(brief(ex), { name: 'פלאנק', sets: 3, reps: null, seconds: 30 });
  assert.equal(ex.rest_seconds, 20);
});

test('«Nx» before a number is unchanged', () => {
  assert.deepEqual(brief(main('פלאנק 3 x 1 דקה')[0]),
    { name: 'פלאנק', sets: 3, reps: null, seconds: 60 });
  assert.deepEqual(brief(main('סקוואט 3x12')[0]),
    { name: 'סקוואט', sets: 3, reps: 12, seconds: null });
});
