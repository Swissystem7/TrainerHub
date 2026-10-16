'use strict';

// Regression: «פלאנק 3x30 שניות» came out as 3×30 reps of an exercise named
// «פלאנק שניות» - the «NxM» pattern took M as reps even when a time unit
// followed it, so the plank lost its timer and its clip name.

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

test('«NxM שניות / דקות» is N timed sets, not M reps', () => {
  assert.deepEqual(brief(main('פלאנק 3x30 שניות')[0]), { name: 'פלאנק', sets: 3, reps: null, seconds: 30 });
  assert.deepEqual(brief(main('בורפי 3x45 שנ׳')[0]), { name: 'בורפי', sets: 3, reps: null, seconds: 45 });
  assert.deepEqual(brief(main('פלאנק 3x1 דקה')[0]), { name: 'פלאנק', sets: 3, reps: null, seconds: 60 });
  assert.deepEqual(brief(main('ריצה 4x2 דקות')[0]), { name: 'ריצה', sets: 4, reps: null, seconds: 120 });
  assert.deepEqual(brief(main('פלאנק 3×1.5 דקות')[0]), { name: 'פלאנק', sets: 3, reps: null, seconds: 90 });
});

test('«NxM» without a time unit stays sets × reps', () => {
  assert.deepEqual(brief(main('סקוואט 3x12')[0]), { name: 'סקוואט', sets: 3, reps: 12, seconds: null });
  const rested = main('סקוואט 3x12 מנוחה 60 שניות')[0];
  assert.deepEqual(brief(rested), { name: 'סקוואט', sets: 3, reps: 12, seconds: null });
  assert.equal(rested.rest_seconds, 60);
  assert.equal(main('סקוואט 3x12 2 דקות מנוחה')[0].rest_seconds, 120);
  assert.deepEqual(brief(main('סקוואט 3x12, מנוחה 2 דקות')[0]), { name: 'סקוואט', sets: 3, reps: 12, seconds: null });
});
