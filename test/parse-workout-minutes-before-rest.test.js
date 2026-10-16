'use strict';

// Regression: Creator Studio's client parser only read a rest written as
// «מנוחה <amount>» or «<N> שניות מנוחה». «סקוואט 3x12 2 דקות מנוחה» became
// «סקוואט מנוחה» with 120 s of work, a «דקה מנוחה בין סטים» line set no rest
// at all, and «מנוחה 1.5» became an exercise named «סקוואט מנוחה 1 5».

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient(text).phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('«2 דקות מנוחה» on an exercise line is that exercise\'s rest', () => {
  const ex = main('אימון כוח 40 דקות\nסקוואט 3x12 2 דקות מנוחה\nלחיצת חזה 3x10');
  assert.equal(ex[0].name, 'סקוואט');
  assert.equal(ex[0].sets, 3);
  assert.equal(ex[0].reps, 12);
  assert.equal(ex[0].duration_seconds, null);
  assert.equal(ex[0].rest_seconds, 120);
  assert.equal(ex[1].rest_seconds, null);
});

test('a «דקה מנוחה בין סטים» line sets every rest', () => {
  const ex = main('אימון כוח 40 דקות\nסקוואט 3x12\nלחיצת חזה 3x10\nדקה מנוחה בין סטים');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'לחיצת חזה']);
  assert.deepEqual(ex.map(function (e) { return e.rest_seconds; }), [60, 60]);
});

test('«דקה וחצי מנוחה» after timed work', () => {
  const ex = main('אימון ריצה 30 דקות\nריצה 5 דקות, דקה וחצי מנוחה');
  assert.equal(ex[0].name, 'ריצה');
  assert.equal(ex[0].duration_seconds, 300);
  assert.equal(ex[0].rest_seconds, 90);
});

test('«מנוחה 1.5» with no unit is minutes', () => {
  const ex = main('אימון כוח 40 דקות\nסקוואט 3x12 מנוחה 1.5\nלחיצת חזה 3x10 מנוחה 1,5.');
  assert.equal(ex[0].name, 'סקוואט');
  assert.equal(ex[0].rest_seconds, 90);
  assert.equal(ex[1].name, 'לחיצת חזה');
  assert.equal(ex[1].rest_seconds, 90);
});

test('unchanged: minutes right after an exercise name are its work time', () => {
  const ex = main('אימון 30 דקות\nפלאנק דקה מנוחה\nהליכה 2 דקות');
  assert.equal(ex[0].duration_seconds, 60);
  assert.equal(ex[0].rest_seconds, null);
  assert.equal(ex[1].duration_seconds, 120);
});

test('unchanged: «מנוחה 90» is seconds and «20 שניות מנוחה» still reads', () => {
  const ex = main('אימון 30 דקות\nסקוואט 3x12 מנוחה 90\nריצה 5 דקות 20 שניות מנוחה');
  assert.equal(ex[0].rest_seconds, 90);
  assert.equal(ex[1].duration_seconds, 300);
  assert.equal(ex[1].rest_seconds, 20);
});
