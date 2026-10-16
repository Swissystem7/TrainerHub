const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]));
}

test('a work/rest pair on an exercise line is its time and rest, not part of its name', () => {
  // Was «ג׳אמפינג ג׳קס עבודה 20», 40 s, no rest.
  assert.deepStrictEqual(rows('ג׳אמפינג ג׳קס 40 שניות עבודה 20 מנוחה'), [['ג׳אמפינג ג׳קס', 1, null, 40, 20]]);
  // Was «ברפי עבודה».
  assert.deepStrictEqual(rows('ברפי 30 שניות עבודה 15 שניות מנוחה'), [['ברפי', 1, null, 30, 15]]);
  assert.deepStrictEqual(rows('סקוואט 40 שניות עבודה / 20 שניות מנוחה'), [['סקוואט', 1, null, 40, 20]]);
  assert.deepStrictEqual(rows('ברפי עבודה 40 שניות מנוחה 20 שניות'), [['ברפי', 1, null, 40, 20]]);
  // Was «ברפי 40 עבודה» with 20 reps.
  assert.deepStrictEqual(rows('ברפי 40 עבודה 20 מנוחה'), [['ברפי', 1, null, 40, 20]]);
  assert.deepStrictEqual(rows('פלאנק דקה עבודה ו-30 שניות מנוחה'), [['פלאנק', 1, null, 60, 30]]);
  assert.deepStrictEqual(rows('ברפי 30 שניות עבודה'), [['ברפי', 1, null, 30, null]]);
});

test('an interval line with bare numbers gives its work and rest to every exercise', () => {
  // The bare «20 מנוחה» was dropped; «עבודה 40 מנוחה 20» gave 10 invented reps and no rest.
  assert.deepStrictEqual(rows('40 שניות עבודה 20 מנוחה\nברפי\nסקוואט'), [
    ['ברפי', 1, null, 40, 20],
    ['סקוואט', 1, null, 40, 20],
  ]);
  assert.deepStrictEqual(rows('עבודה 40 מנוחה 20\nברפי'), [['ברפי', 1, null, 40, 20]]);
  assert.deepStrictEqual(rows('40 שניות עבודה, 20 מנוחה: ברפי, סקוואט'), [
    ['ברפי', 1, null, 40, 20],
    ['סקוואט', 1, null, 40, 20],
  ]);
});

test('a rep count before a rest is still reps', () => {
  assert.deepStrictEqual(rows('סקוואט 3x15 מנוחה 60'), [['סקוואט', 3, 15, null, 60]]);
  assert.deepStrictEqual(rows('סקוואט 15 חזרות מנוחה 30 שניות'), [['סקוואט', 1, 15, null, 30]]);
});
