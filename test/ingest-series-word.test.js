const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]));
}

test('«סדרות» is sets, like «סטים»', () => {
  // Was a name «סקוואט 3 סדרות של» with one set.
  assert.deepStrictEqual(rows('סקוואט 3 סדרות של 12'), [['סקוואט', 3, 12, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3 סדרות 12 חזרות'), [['סקוואט', 3, 12, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3 סדרות של 30 שניות'), [['פלאנק', 3, null, 30, null]]);
  // «בין הסדרות» is rest filler, not part of the name.
  assert.deepStrictEqual(rows('סקוואט 4 סדרות של 10, מנוחה 60 שניות בין הסדרות'), [['סקוואט', 4, 10, null, 60]]);
});

test('a «N סדרות» line sets the sets for the exercises under it', () => {
  assert.deepStrictEqual(rows('3 סדרות\nסקוואט 12\nלאנג׳ 10'), [['סקוואט', 3, 12, null, null], ['לאנג׳', 3, 10, null, null]]);
});

test('«סדרה 1:» is a section header, not an exercise', () => {
  assert.deepStrictEqual(rows('סדרה 1:\nסקוואט 12\nסדרה 2:\nברפי 10'), [['סקוואט', 1, 12, null, null], ['ברפי', 1, 10, null, null]]);
});
