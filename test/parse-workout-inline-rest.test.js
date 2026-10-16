'use strict';

// Regression: on Creator Studio's client parser a rest written on the exercise's own
// line («סקוואט 3x12 מנוחה 60 שניות») became the exercise's work time (60 s) with
// «מנוחה» left in its name, and the same rest was copied to every other exercise.
// A bare «מנוחה 60» on an exercise line dropped the exercise altogether, and the
// interval line «40 שניות עבודה 20 שניות מנוחה» was a phantom exercise.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  const w = parseWorkoutClient(text);
  const phase = w.phases.find(function (p) { return p.name === 'Main'; });
  return phase.exercises.map(function (e) {
    return [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds];
  });
}

test('a rest on the exercise line is that exercise\'s rest, not its work time', function () {
  assert.deepEqual(main('אימון רגליים 45 דקות\nסקוואט 3x12 מנוחה 60 שניות\nלאנג\' 3x10\nפלאנק 30 שניות'), [
    ['סקוואט', 3, 12, null, 60],
    ['לאנג\'', 3, 10, null, null],
    ['פלאנק', 1, null, 30, null]
  ]);
  assert.deepEqual(main('אימון כוח\nסקוואט 4 סטים של 8 חזרות, מנוחה 90 שניות\nלחיצת חזה 4x8'), [
    ['סקוואט', 4, 8, null, 90],
    ['לחיצת חזה', 4, 8, null, null]
  ]);
});

test('«מנוחה 60», «מנוחה 2 דקות» and «מנוחה דקה» on an exercise line keep the exercise', function () {
  assert.deepEqual(main('אימון\nסקוואט 3x12 מנוחה 60\nלחיצת חזה 3x10'), [
    ['סקוואט', 3, 12, null, 60],
    ['לחיצת חזה', 3, 10, null, null]
  ]);
  assert.deepEqual(main('אימון\nעיקר:\nסקוואט 3x12, מנוחה 2 דקות\nמתח 3x5 מנוחה דקה'), [
    ['סקוואט', 3, 12, null, 120],
    ['מתח', 3, 5, null, 60]
  ]);
});

test('a rest line still sets the rest of every exercise, and an exercise\'s own rest wins', function () {
  assert.deepEqual(main('אימון\nמנוחה 45 שניות בין תרגילים\nסקוואט 3x12\nפלאנק 30 שניות מנוחה 15 שניות'), [
    ['סקוואט', 3, 12, null, 45],
    ['פלאנק', 1, null, 30, 15]
  ]);
  assert.deepEqual(main('אימון 30 דקות, מנוחה 30 שניות בין תרגילים\nסקוואט 3x12'), [
    ['סקוואט', 3, 12, null, 30]
  ]);
});

test('«40 שניות עבודה 20 שניות מנוחה» is the interval, not an exercise', function () {
  assert.deepEqual(main('HIIT 20 דקות\n40 שניות עבודה 20 שניות מנוחה\nברפי\nמטפסים'), [
    ['ברפי', 1, null, 40, 20],
    ['מטפסים', 1, null, 40, 20]
  ]);
});
