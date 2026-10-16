'use strict';

// Regression: a session-wide «40 שניות עבודה» line was the starting duration of
// every exercise, so the line's own time never got read: «ריצה 5 דקות» was 40 s
// of an exercise named «ריצה 5 דקות», «פלאנק דקה וחצי» 40 s, «לחיצה 3x12» a
// 40 s timer on top of its reps, and «בורפי 30 שניות עבודה» was named «בורפי עבודה».

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

const HEAD = 'אימון טבטה\n40 שניות עבודה 20 שניות מנוחה\n';

function main(text) {
  return parseWorkoutClient(text).phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('minutes on an exercise line beat the session work time', () => {
  const ex = main(HEAD + 'ריצה 5 דקות\nפלאנק דקה וחצי');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ריצה', 'פלאנק']);
  assert.deepEqual(ex.map(function (e) { return e.duration_seconds; }), [300, 90]);
  assert.deepEqual(ex.map(function (e) { return e.rest_seconds; }), [20, 20]);
});

test('«30 שניות עבודה» on an exercise line is its time, not part of its name', () => {
  const ex = main(HEAD + 'בורפי 30 שניות עבודה');
  assert.equal(ex[0].name, 'בורפי');
  assert.equal(ex[0].duration_seconds, 30);
});

test('a line with reps gets no session work timer', () => {
  const ex = main(HEAD + 'לחיצה 3x12');
  assert.equal(ex[0].sets, 3);
  assert.equal(ex[0].reps, 12);
  assert.equal(ex[0].duration_seconds, null);
});

test('a bare exercise still takes the session work time', () => {
  const ex = main(HEAD + 'סקוואט\nבורפי');
  assert.deepEqual(ex.map(function (e) { return e.duration_seconds; }), [40, 40]);
  assert.deepEqual(ex.map(function (e) { return e.reps; }), [null, null]);
});
