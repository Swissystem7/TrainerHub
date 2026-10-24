'use strict';

// Regression: «בורפי 10 חזרות x 3 סבבים» came out as an exercise named «בורפי x»
// and «מתח 4 סטים × 6» as «מתח × 6» with 10 invented reps - an x next to the
// sets / rounds count stayed in the name and the reps after «סטים ×» were lost.

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

test('«M חזרות x N סבבים / סטים» is N sets of M, without the x in the name', () => {
  const ex = main('בורפי 10 חזרות x 3 סבבים\nשכיבות סמיכה 12 חזרות × 4 סטים\nקפיצות 45 שניות x 4 סבבים');
  assert.deepEqual(ex.map(brief), [
    { name: 'בורפי', sets: 3, reps: 10, seconds: null },
    { name: 'שכיבות סמיכה', sets: 4, reps: 12, seconds: null },
    { name: 'קפיצות', sets: 4, reps: null, seconds: 45 }
  ]);
});

test('«N סטים × M» is N sets of M reps, and «× M שניות» is M seconds', () => {
  const ex = main('מתח 4 סטים × 6\nסקוואט 3 סטים x 12 חזרות\nפלאנק 3 סטים × 30 שניות');
  assert.deepEqual(ex.map(brief), [
    { name: 'מתח', sets: 4, reps: 6, seconds: null },
    { name: 'סקוואט', sets: 3, reps: 12, seconds: null },
    { name: 'פלאנק', sets: 3, reps: null, seconds: 30 }
  ]);
});

test('«3x12» and «3 סטים של 12» are unchanged', () => {
  const ex = main('סקוואט 3x12\nלחיצת כתפיים 3 סטים של 10\nבורפי 30 שניות, 3 סבבים');
  assert.deepEqual(ex.map(brief), [
    { name: 'סקוואט', sets: 3, reps: 12, seconds: null },
    { name: 'לחיצת כתפיים', sets: 3, reps: 10, seconds: null },
    { name: 'בורפי', sets: 3, reps: null, seconds: 30 }
  ]);
});
