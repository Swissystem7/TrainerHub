'use strict';

// Regression: «שכיבות סמיכה 2-4-6-8-10» came out as one set of 10 reps of an
// exercise named «שכיבות סמיכה 2 4 6 8 10». A ladder is one set per step,
// starting at the first step, with the whole ladder in the notes.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון סולם\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a rep ladder is one set per step, not part of the name', () => {
  const ex = main('שכיבות סמיכה 2-4-6-8-10\nבורפי 2-4-6-8-10-8-6-4-2 חזרות\nסקוואט 10–8–6 חזרות, מנוחה 60 שניות');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['שכיבות סמיכה', 'בורפי', 'סקוואט']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps]; }), [[5, 2], [9, 2], [3, 10]]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }),
    ['סולם 2-4-6-8-10 חזרות', 'סולם 2-4-6-8-10-8-6-4-2 חזרות', 'סולם 10-8-6 חזרות']);
  assert.equal(ex[2].rest_seconds, 60);
});

test('plain NxM lines are unchanged', () => {
  const ex = main('מתח 3x8\nלחיצת חזה 4x8 80 קג');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.reps]; }),
    [['מתח', 3, 8], ['לחיצת חזה', 4, 8]]);
});
