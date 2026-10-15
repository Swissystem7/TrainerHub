const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('a «+» between two counted exercises splits them like a comma', () => {
  // Was one exercise «שכיבות סמיכה 20 + פלאנק» of 30 s, the 20 push-ups lost.
  assert.deepStrictEqual(rows('שכיבות סמיכה 20 + פלאנק 30 שניות'), [
    ['שכיבות סמיכה', 1, 20, null],
    ['פלאנק', 1, null, 30],
  ]);
  assert.deepStrictEqual(rows('10 ברפי + 20 סקוואט'), [
    ['ברפי', 1, 10, null],
    ['סקוואט', 1, 20, null],
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12 + לחיצת כתפיים 3x10'), [
    ['סקוואט', 3, 12, null],
    ['לחיצת כתפיים', 3, 10, null],
  ]);
  assert.deepStrictEqual(rows('מתח 5 + מקבילים 10, סקוואט 15'), [
    ['מתח', 1, 5, null],
    ['מקבילים', 1, 10, null],
    ['סקוואט', 1, 15, null],
  ]);
});

test('a «+» inside one combo move, or with no exercise after it, does not split', () => {
  assert.deepStrictEqual(rows('סקוואט + קפיצה 10'), [['סקוואט + קפיצה', 1, 10, null]]);
  assert.equal(rows('פלאנק 30+30 שניות').length, 1);
});
