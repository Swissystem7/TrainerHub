const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('a count split off by a comma reaches the exercise before it', () => {
  // Was 3 sets of an invented 10 reps, the 12 lost.
  assert.deepStrictEqual(rows('סקוואט 3 סטים, 12 חזרות'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט, 3 סטים, 12 חזרות'), [['סקוואט', 3, 12, null]]);
  // Was 3 sets of 10 reps, not 30 s.
  assert.deepStrictEqual(rows('פלאנק 3 סטים, 30 שניות'), [['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('לחיצת כתפיים 4 סטים, 10 חזרות, מנוחה 90 שניות'), [['לחיצת כתפיים', 4, 10, null]]);
});

test('an exercise with its own count keeps it', () => {
  assert.deepStrictEqual(rows('סקוואט 12 חזרות, 3 סטים'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 15, 20'), [['סקוואט', 1, 15, null]]);
});
