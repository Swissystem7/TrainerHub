const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  const out = [];
  Ingest.ingestText(text).workout.phases.forEach((ph) => {
    ph.exercises.forEach((e) => {
      out.push({ name: e.name, sets: e.sets, reps: e.reps, duration_seconds: e.duration_seconds, rest_seconds: e.rest_seconds });
    });
  });
  return out;
}

const SQUAT = (rest) => [{ name: 'סקוואט', sets: 3, reps: 10, duration_seconds: null, rest_seconds: rest }];

test('«מנוחה 2-3 דקות» on an exercise line is 2 minutes of rest, not 2 s of rest and 180 s of work', () => {
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה 2-3 דקות'), SQUAT(120));
  assert.deepStrictEqual(rows('סקוואט 3x10, מנוחה 2-3 דקות'), SQUAT(120));
  assert.deepStrictEqual(rows('סקוואט 3x10 2-3 דקות מנוחה'), SQUAT(120));
});

test('«מנוחה 60-90 שניות» keeps the 10 reps and rests 60 s', () => {
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה 60-90 שניות'), SQUAT(60));
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה: 60-90 שניות'), SQUAT(60));
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה 60 עד 90 שניות'), SQUAT(60));
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה 60"-90"'), SQUAT(60));
});

test('a clock range «מנוחה 1:00-1:30» is 60 s of rest, not 90 s of work', () => {
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה 1:00-1:30'), SQUAT(60));
});

test('a rest line «מנוחה 2-3 דקות בין הסטים» rests every exercise and is not an exercise of its own', () => {
  const got = rows('סקוואט 3x10\nלאנג׳ 3x10\nמנוחה 2-3 דקות בין הסטים');
  assert.deepStrictEqual(got.map((r) => [r.name, r.sets, r.reps, r.duration_seconds, r.rest_seconds]), [
    ['סקוואט', 3, 10, null, 120],
    ['לאנג׳', 3, 10, null, 120]
  ]);
});

test('a range of reps or of work time is untouched', () => {
  assert.deepStrictEqual(rows('סקוואט 3x10-12 מנוחה 90 שניות'), SQUAT(90));
  assert.deepStrictEqual(rows('פלאנק 30-45 שניות'), [
    { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 30, rest_seconds: null }
  ]);
});
