'use strict';

// Regression: «שכיבות סמיכה 15 פעמים» came out as 10 invented reps of an exercise
// named «שכיבות סמיכה 15 פעמים», and «סקוואט 3x12 חזרות» was named «סקוואט חזרות» -
// «פעמים» was never read as a count and the unit word after «NxM» stayed in the name.

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

test('«N פעמים» / «N פעם» is N reps', () => {
  const ex = main('שכיבות סמיכה 15 פעמים\nסקוואט 20 פעם');
  assert.deepEqual(ex.map(brief), [
    { name: 'שכיבות סמיכה', sets: 1, reps: 15, seconds: null },
    { name: 'סקוואט', sets: 1, reps: 20, seconds: null }
  ]);
});

test('«NxM חזרות» / «NxM פעמים» keeps the unit out of the name', () => {
  const ex = main('סקוואט 3x12 חזרות\nלחיצת חזה 4x8 פעמים');
  assert.deepEqual(ex.map(brief), [
    { name: 'סקוואט', sets: 3, reps: 12, seconds: null },
    { name: 'לחיצת חזה', sets: 4, reps: 8, seconds: null }
  ]);
});

test('«N פעמים» with a distance or a time is N sets', () => {
  const ex = main('ספרינט 10 מטר 5 פעמים\nבורפי 3 פעמים 30 שניות');
  assert.deepEqual(ex.map(brief), [
    { name: 'ספרינט', sets: 5, reps: null, seconds: null },
    { name: 'בורפי', sets: 3, reps: null, seconds: 30 }
  ]);
  assert.equal(ex[0].notes, '10 מטר');
});
