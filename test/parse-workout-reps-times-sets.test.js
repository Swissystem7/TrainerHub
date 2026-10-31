'use strict';

// Regression: «שכיבות סמיכה 15 חזרות 3 פעמים» came out as one set of 15 - the
// line already had its reps, so «3 פעמים» was thrown away instead of being read
// as the sets. «15 פעמים» alone is still 15 reps.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('«15 חזרות 3 פעמים» is 3 sets of 15', () => {
  const ex = main('שכיבות סמיכה 15 חזרות 3 פעמים\nסקוואט 3 פעמים 12 חזרות');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['שכיבות סמיכה', 'סקוואט']);
  assert.deepEqual(ex.map(function (e) { return e.sets; }), [3, 3]);
  assert.deepEqual(ex.map(function (e) { return e.reps; }), [15, 12]);
});

test('«N פעמים» without reps is still the reps', () => {
  const ex = main('כפיפות בטן 20 פעמים\nמתח 3x8 פעמים\nבורפי 3 פעמים 30 שניות');
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[1, 20, null], [3, 8, null], [3, null, 30]]);
});
