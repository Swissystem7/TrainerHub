const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]));
}

test('a bare number before «מנוחה» after the exercise count is its rest, not part of its name', () => {
  // Was «ברפי 20» with no rest.
  assert.deepStrictEqual(rows('ברפי 40 שניות 20 מנוחה'), [['ברפי', 1, null, 40, 20]]);
  // Was «סקוואט 30».
  assert.deepStrictEqual(rows('סקוואט 15 חזרות 30 מנוחה'), [['סקוואט', 1, 15, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3x15 60 מנוחה'), [['סקוואט', 3, 15, null, 60]]);
  assert.deepStrictEqual(rows('סקוואט 3x15 עם 60 הפסקה'), [['סקוואט', 3, 15, null, 60]]);
  assert.deepStrictEqual(rows('פלאנק דקה 30 מנוחה'), [['פלאנק', 1, null, 60, 30]]);
  assert.deepStrictEqual(rows('ברפי 40 שניות 20 מנוחה בין הסבבים'), [['ברפי', 1, null, 40, 20]]);
});

test('the only number before «מנוחה» stays the exercise count', () => {
  assert.deepStrictEqual(rows('סקוואט 15 מנוחה'), [['סקוואט', 1, 15, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 15 מנוחה 30'), [['סקוואט', 1, 15, null, 30]]);
});
