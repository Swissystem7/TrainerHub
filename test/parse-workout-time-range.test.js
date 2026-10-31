'use strict';

// Regression: «פלאנק 30-45 שניות» came out as one 45-second set of an
// exercise named «פלאנק 30». A bare time range is the lower bound, with the
// range in the notes, the way «3x30-45 שניות» and rep ranges are read.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון טווח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a bare time range is the lower bound, not part of the name', () => {
  const ex = main('פלאנק 30-45 שניות\nריצה 20-30 דקות\nכיסא קיר 30 – 45 שניות, מנוחה 30 שניות\nהליכה 10-15 דק\'');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['פלאנק', 'ריצה', 'כיסא קיר', 'הליכה']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[1, null, 30], [1, null, 1200], [1, null, 30], [1, null, 600]]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }),
    ['30-45 שניות', '20-30 דקות', '30-45 שניות', '10-15 דקות']);
  assert.equal(ex[2].rest_seconds, 30);
});

test('plain timed lines are unchanged', () => {
  const ex = main('פלאנק 30 שניות\nריצה 5 דקות\nבורפי 3x30 שניות');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.duration_seconds, e.notes]; }),
    [['פלאנק', 1, 30, null], ['ריצה', 1, 300, null], ['בורפי', 3, 30, null]]);
});
