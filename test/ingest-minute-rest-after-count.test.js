const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]);
}

test('«דקה מנוחה» after the count is a minute of rest, not the count in minutes', () => {
  // Was 1 set of 3 reps with 720 s rest («12 דקה» read as twelve minutes).
  assert.deepStrictEqual(rows('סקוואט 3x12 דקה מנוחה'), [['סקוואט', 3, 12, null, 60]]);
  // Was 1 set of 3 reps with 750 s rest.
  assert.deepStrictEqual(rows('סקוואט 3x12 דקה וחצי מנוחה'), [['סקוואט', 3, 12, null, 90]]);
  assert.deepStrictEqual(rows('סקוואט 3 x 12 חצי דקה מנוחה'), [['סקוואט', 3, 12, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3 סטים של 12 דקה מנוחה'), [['סקוואט', 3, 12, null, 60]]);
  // «12 דקה» is twelve then a minute; twelve minutes would be «12 דקות».
  assert.deepStrictEqual(rows('סקוואט 12 דקה מנוחה'), [['סקוואט', 1, 12, null, 60]]);
});

test('a real time before «מנוחה» is still the rest', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12 2 דקות מנוחה'), [['סקוואט', 3, 12, null, 120]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 90 שניות מנוחה'), [['סקוואט', 3, 12, null, 90]]);
  assert.deepStrictEqual(rows('ברפי 40 שניות דקה מנוחה'), [['ברפי', 1, null, 40, 60]]);
  assert.deepStrictEqual(rows('פלאנק 3x30 שניות 15 שניות מנוחה'), [['פלאנק', 3, null, 30, 15]]);
});
