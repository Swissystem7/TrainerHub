const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('«N פעמים» / «פעמיים» after the exercise count is the sets', () => {
  // Was a name «ברפי 3 פעמים» with one set.
  assert.deepStrictEqual(rows('ברפי 10 חזרות 3 פעמים'), [['ברפי', 3, 10, null]]);
  // Was a name «פלאנק פעמיים».
  assert.deepStrictEqual(rows('פלאנק 30 שניות פעמיים'), [['פלאנק', 2, null, 30]]);
  assert.deepStrictEqual(rows('פלאנק דקה פעמיים'), [['פלאנק', 2, null, 60]]);
  // Was 3 reps of a 30 s plank.
  assert.deepStrictEqual(rows('פלאנק 30 שניות 3 פעמים'), [['פלאנק', 3, null, 30]]);
  // Was a name «ברפי 10 פעמיים».
  assert.deepStrictEqual(rows('ברפי 10 פעמיים'), [['ברפי', 2, 10, null]]);
  // Was 3 reps of «10 חזרות שכיבות סמיכה».
  assert.deepStrictEqual(rows('3 פעמים 10 חזרות שכיבות סמיכה'), [['שכיבות סמיכה', 3, 10, null]]);
});

test('the only «N פעמים» stays the reps', () => {
  assert.deepStrictEqual(rows('סקוואט 15 פעמים'), [['סקוואט', 1, 15, null]]);
  assert.deepStrictEqual(rows('עבודה 40 מנוחה 20\nברפי 15 פעמים'), [['ברפי', 1, 15, 40]]);
});
