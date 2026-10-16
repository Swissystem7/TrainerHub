'use strict';

// Regression: «פלאנק 3 סטים של 30 שניות» came out as 3×30 reps of an exercise
// named «פלאנק שניות» - the «N סטים של M» pattern took M as reps even when a time
// unit followed it, so the plank lost its timer and its clip name.

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

test('«N סטים של M שניות / דקות» is N timed sets, not M reps', () => {
  const ex = main('פלאנק 3 סטים של 30 שניות\nפלאנק צד 2 סטים של 2 דקות\nכפיפות בטן 4 סטים של 1.5 דקות');
  assert.deepEqual(ex.map(brief), [
    { name: 'פלאנק', sets: 3, reps: null, seconds: 30 },
    { name: 'פלאנק צד', sets: 2, reps: null, seconds: 120 },
    { name: 'כפיפות בטן', sets: 4, reps: null, seconds: 90 }
  ]);
});

test('«N סטים של M» and «N סטים של M חזרות» are still reps', () => {
  const ex = main('סקוואט 3 סטים של 12\nלחיצת כתפיים 4 סטים של 10 חזרות');
  assert.deepEqual(ex.map(brief), [
    { name: 'סקוואט', sets: 3, reps: 12, seconds: null },
    { name: 'לחיצת כתפיים', sets: 4, reps: 10, seconds: null }
  ]);
});
