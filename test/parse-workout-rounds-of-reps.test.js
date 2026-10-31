'use strict';

// Regression: «בורפי 5 סבבים של 10» came out as an exercise named «בורפי 10»
// with 5×10 invented reps - the «N סבבים של» pattern ate «של» but left the
// rep count in the name, unlike «N סטים של M».

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

test('«N סבבים של M» / «של M חזרות» is N sets of M reps', () => {
  const ex = main('בורפי 5 סבבים של 10\nסקוואט 4 סבבים של 15 חזרות');
  assert.deepEqual(ex.map(brief), [
    { name: 'בורפי', sets: 5, reps: 10, seconds: null },
    { name: 'סקוואט', sets: 4, reps: 15, seconds: null }
  ]);
});

test('«N סבבים של M שניות / דקות» is still N timed sets', () => {
  const ex = main('פלאנק 3 סבבים של 30 שניות\nחבל קפיצה 2 סבבים של 2 דקות');
  assert.deepEqual(ex.map(brief), [
    { name: 'פלאנק', sets: 3, reps: null, seconds: 30 },
    { name: 'חבל קפיצה', sets: 2, reps: null, seconds: 120 }
  ]);
});
