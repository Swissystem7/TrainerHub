'use strict';

// Regression: a count after an x that follows a unit stayed in the exercise name and the
// line kept one set (or invented 10 reps): «פלאנק 30 שניות x 3» was «פלאנק x 3» × 1,
// «מתח 5 חזרות × 4» was «מתח × 4» × 1, «ריצה 2 דקות x 4» was «ריצה x 4» × 1, and
// «סקוואט 12 x 3 סטים» was «סקוואט 12 x», 3 × 10.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function first(text) {
  const e = parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises[0];
  return { name: e.name, sets: e.sets, reps: e.reps, seconds: e.duration_seconds, rest: e.rest_seconds };
}

test('«N שניות x M» / «N דקות x M» is M sets of a timed step', () => {
  assert.deepEqual(first('פלאנק 30 שניות x 3'), { name: 'פלאנק', sets: 3, reps: null, seconds: 30, rest: null });
  assert.deepEqual(first('פלאנק 30 שנ׳ × 3 סבבים'), { name: 'פלאנק', sets: 3, reps: null, seconds: 30, rest: null });
  assert.deepEqual(first('ריצה 2 דקות x 4'), { name: 'ריצה', sets: 4, reps: null, seconds: 120, rest: null });
  assert.deepEqual(first('ריצה 1.5 דקות x 4 מנוחה 60 שניות'), { name: 'ריצה', sets: 4, reps: null, seconds: 90, rest: 60 });
  assert.deepEqual(first('קפיצות 45 שניות עבודה 15 שניות מנוחה x 8'), { name: 'קפיצות', sets: 8, reps: null, seconds: 45, rest: 15 });
});

test('«N חזרות × M» is M sets of N reps', () => {
  assert.deepEqual(first('מתח 5 חזרות × 4'), { name: 'מתח', sets: 4, reps: 5, seconds: null, rest: null });
  assert.deepEqual(first('בורפי 10 חזרות x 3 סבבים'), { name: 'בורפי', sets: 3, reps: 10, seconds: null, rest: null });
});

test('a bare «N x M סטים» is N reps, M sets', () => {
  assert.deepEqual(first('סקוואט 12 x 3 סטים'), { name: 'סקוואט', sets: 3, reps: 12, seconds: null, rest: null });
  assert.deepEqual(first('לחיצת חזה 10 x 4 סבבים'), { name: 'לחיצת חזה', sets: 4, reps: 10, seconds: null, rest: null });
});

test('NxM, «N x M שניות» and distances are unchanged', () => {
  assert.deepEqual(first('סקוואט 3x12'), { name: 'סקוואט', sets: 3, reps: 12, seconds: null, rest: null });
  assert.deepEqual(first('סקוואט 3x12 חזרות'), { name: 'סקוואט', sets: 3, reps: 12, seconds: null, rest: null });
  assert.deepEqual(first('פלאנק 3 x 30 שניות'), { name: 'פלאנק', sets: 3, reps: null, seconds: 30, rest: null });
  assert.equal(first('ספרינט 50 מטר x 6').sets, 6);
});
