'use strict';

// Regression: «פלאנק 20-30-40 שניות» came out as one 40-second set of an
// exercise named «פלאנק 20 30». A time ladder is one set per step, starting
// at the first step, with the whole ladder in the notes.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון סולם\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a time ladder is one set per step, not part of the name', () => {
  const ex = main('פלאנק 20-30-40 שניות\nריצה 1-2-3 דקות\nכיסא קיר 30–45–60 שניות, מנוחה 30 שניות');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['פלאנק', 'ריצה', 'כיסא קיר']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[3, null, 20], [3, null, 60], [3, null, 30]]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }),
    ['סולם 20-30-40 שניות', 'סולם 1-2-3 דקות', 'סולם 30-45-60 שניות']);
  assert.equal(ex[2].rest_seconds, 30);
});

test('plain timed lines are unchanged', () => {
  const ex = main('פלאנק 30 שניות\nריצה 5 דקות\nבורפי 3x30 שניות');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.duration_seconds]; }),
    [['פלאנק', 1, 30], ['ריצה', 1, 300], ['בורפי', 3, 30]]);
});
