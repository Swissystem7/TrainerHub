const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).exercises.map((e) => [e.name, e.sets, e.reps, e.notes]);
}

test('the load is a note, not part of the exercise name', () => {
  // Was a name «לחיצת חזה 80 קג» that matches no clip.
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 80 קג'), [['לחיצת חזה', 4, 8, '80 ק"ג']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 80 ק"ג'), [['לחיצת חזה', 4, 8, '80 ק"ג']]);
  assert.deepStrictEqual(rows('גובלט סקוואט 16 ק״ג 3x10'), [['גובלט סקוואט', 3, 10, '16 ק"ג']]);
  // Was a name «סקוואט עם 20 קילו».
  assert.deepStrictEqual(rows('סקוואט 3x10 עם 20 קילו'), [['סקוואט', 3, 10, '20 ק"ג']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 100kg'), [['דדליפט', 5, 5, '100 ק"ג']]);
  assert.deepStrictEqual(rows('מכרע 3x10 עם 7.5 קג לכל יד'), [['מכרע', 3, 10, 'לכל יד · 7.5 ק"ג']]);
});

test('a load alone is not the rep count', () => {
  // Was a name «סקוואט 20 קילו».
  assert.deepStrictEqual(rows('סקוואט 20 קילו'), [['סקוואט', 1, 10, '20 ק"ג']]);
});

test('«עם משקולת» stays in the name and «קילומטר» is not a load', () => {
  assert.deepStrictEqual(rows('חתירה עם משקולת 12 ק"ג 3x12'), [['חתירה עם משקולת', 3, 12, '12 ק"ג']]);
  assert.equal(rows('ריצה 2 קילומטר')[0][3], null);
});
