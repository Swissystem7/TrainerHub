const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]));
}

test('a count written in Hebrew words is that number', () => {
  // Was a name «סקוואט עשר חזרות» with 10 invented reps.
  assert.deepStrictEqual(rows('סקוואט עשר חזרות'), [['סקוואט', 1, 10, null, null]]);
  assert.deepStrictEqual(rows('מתח חמש חזרות'), [['מתח', 1, 5, null, null]]);
  assert.deepStrictEqual(rows('בטן חמש עשרה חזרות'), [['בטן', 1, 15, null, null]]);
  assert.deepStrictEqual(rows('שכיבות סמיכה עשרים וחמש חזרות'), [['שכיבות סמיכה', 1, 25, null, null]]);
  // Was a name «פלאנק שלושים שניות» with 10 reps.
  assert.deepStrictEqual(rows('פלאנק שלושים שניות'), [['פלאנק', 1, null, 30, null]]);
  // Was a name «ברפי עשר».
  assert.deepStrictEqual(rows('ברפי 3 סטים של עשר'), [['ברפי', 3, 10, null, null]]);
  assert.deepStrictEqual(rows('שלושה סטים של 12 סקוואט'), [['סקוואט', 3, 12, null, null]]);
  assert.deepStrictEqual(rows('מתח 3xשמונה'), [['מתח', 3, 8, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה שלושים שניות'), [['סקוואט', 3, 12, null, 30]]);
  assert.deepStrictEqual(rows('שלושה סבבים: סקוואט 10, ברפי 5'), [['סקוואט', 3, 10, null, null], ['ברפי', 3, 5, null, null]]);
});

test('a number word that is not a count stays in the name', () => {
  assert.deepStrictEqual(rows('סקוואט על רגל אחת 10'), [['סקוואט על רגל אחת', 1, 10, null, null]]);
});
