'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds, (e.notes || '').replace(/\s*·\s*חסר סרטון$|^חסר סרטון$/, '') || null]));
}

test('«גשר 2x12 3 שניות למעלה» is 2×12 with the hold as a note, not a name «גשר למעלה» held 3 seconds', () => {
  // The hold was read as the work time and the word rode into the name, so no clip matched and
  // workout mode ran a 3-second timer instead of counting 12 reps. Only the bracketed form was a note.
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות למעלה'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 2 שניות למטה'), [['סקוואט', 3, 12, null, null, '2 שניות למטה']]);
  assert.deepStrictEqual(rows('סקוואט 3x10 3 שניות ירידה'), [['סקוואט', 3, 10, null, null, '3 שניות ירידה']]);
  assert.deepStrictEqual(rows('גשר 3x12 2 שניות עצירה למעלה'), [['גשר', 3, 12, null, null, '2 שניות עצירה למעלה']]);
  assert.deepStrictEqual(rows('גשר 3x12 2 שניות בשיא'), [['גשר', 3, 12, null, null, '2 שניות בשיא']]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שנ׳ למעלה'), [['גשר', 2, 12, null, null, '3 שנ׳ למעלה']]);
  assert.deepStrictEqual(rows('גשר 2 סטים 12 חזרות 3 שניות למעלה'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 12 חזרות 3 שניות למעלה'), [['גשר', 1, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות למעלה מנוחה 60 שניות'), [['גשר', 2, 12, null, 60, '3 שניות למעלה']]);
});

test('«החזקה של 3 שניות», «ירידה איטית 3 שניות» and «עצירה של 2 שניות למעלה» are hold notes too', () => {
  // Were names «גשר החזקה למעלה», «גשר עם החזקה של», «סקוואט ירידה איטית», «גשר עצירה של למעלה».
  assert.deepStrictEqual(rows('גשר 2x12 החזקה 3 שניות למעלה'), [['גשר', 2, 12, null, null, 'החזקה 3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12 להחזיק 3 שניות'), [['גשר', 2, 12, null, null, 'להחזיק 3 שניות']]);
  assert.deepStrictEqual(rows('גשר 2x12 עם החזקה של 3 שניות'), [['גשר', 2, 12, null, null, 'החזקה של 3 שניות']]);
  assert.deepStrictEqual(rows('סקוואט 3x10 ירידה של 3 שניות'), [['סקוואט', 3, 10, null, null, 'ירידה של 3 שניות']]);
  assert.deepStrictEqual(rows('סקוואט 3x10 ירידה איטית 3 שניות'), [['סקוואט', 3, 10, null, null, 'ירידה איטית 3 שניות']]);
  assert.deepStrictEqual(rows('גשר 3x12 עצירה של 2 שניות למעלה'), [['גשר', 3, 12, null, null, 'עצירה של 2 שניות למעלה']]);
});

test('«3 שניות למטה 1 שנייה למעלה» is two notes, a bare «3 שניות» next to a count is a hold', () => {
  // «סקוואט 3x12 3 שניות למטה 1 שנייה למעלה» was a name «סקוואט למטה 1 שנייה למעלה» held 3 s;
  // «גשר 2x12 (3 שניות)» read 12 reps and a 3-second duration both.
  assert.deepStrictEqual(rows('סקוואט 3x12 3 שניות למטה 1 שנייה למעלה'), [['סקוואט', 3, 12, null, null, '3 שניות למטה · 1 שנייה למעלה']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 3 שניות ירידה 1 שנייה עלייה'), [['סקוואט', 3, 12, null, null, '3 שניות ירידה · 1 שנייה עלייה']]);
  assert.deepStrictEqual(rows('גשר 2x12 (3 שניות)'), [['גשר', 2, 12, null, null, '3 שניות']]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות'), [['גשר', 2, 12, null, null, '3 שניות']]);
  assert.deepStrictEqual(rows("גשר 2x12 3 שנ'"), [['גשר', 2, 12, null, null, "3 שנ'"]]);
  assert.deepStrictEqual(rows('מתח 5 חזרות 3 שניות'), [['מתח', 1, 5, null, null, '3 שניות']]);
});

test('the hold rides on its exercise as a comma piece, after a dash, on its own line and next to other cues', () => {
  // «, 3 שניות למעלה» was a second exercise «למעלה» of 3 s, the lone line the same phantom.
  assert.deepStrictEqual(rows('גשר 2x12, 3 שניות למעלה'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12 - 3 שניות למעלה'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12\n3 שניות למעלה'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות למעלה\nפלאנק 30 שניות'), [['גשר', 2, 12, null, null, '3 שניות למעלה'], ['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות למעלה, פלאנק 30 שניות'), [['גשר', 2, 12, null, null, '3 שניות למעלה'], ['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות למעלה (לאט)'), [['גשר', 2, 12, null, null, 'לאט · 3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12 3 שניות למעלה RPE 8'), [['גשר', 2, 12, null, null, '3 שניות למעלה · RPE 8']]);
});

test('a timed exercise, sets of seconds, a rest, a long bare time and the bracketed hold are as they were', () => {
  assert.deepStrictEqual(rows('פלאנק 30 שניות'), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3x30 שניות'), [['פלאנק', 3, null, 30, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3 סטים 30 שניות'), [['פלאנק', 3, null, 30, null, null]]);
  assert.deepStrictEqual(rows('ספרינט 3x10 שניות'), [['ספרינט', 3, null, 10, null, null]]);
  assert.deepStrictEqual(rows('ריצה 8 פעמים 10 שניות'), [['ריצה', 8, null, 10, null, null]]);
  assert.deepStrictEqual(rows('ספרינט 4 סטים, 10 שניות'), [['ספרינט', 4, null, 10, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3 סטים, 30 שניות'), [['סקוואט', 3, null, 30, null, null]]);
  assert.deepStrictEqual(rows('גשר 2x12 30 שניות'), [['גשר', 2, 12, 30, null, null]]);
  assert.deepStrictEqual(rows('גשר 2x12 מנוחה 30 שניות'), [['גשר', 2, 12, null, 30, null]]);
  assert.deepStrictEqual(rows('שכיבות סמיכה 10 חזרות 5 שניות מנוחה'), [['שכיבות סמיכה', 1, 10, null, 5, null]]);
  assert.deepStrictEqual(rows('ברפי 30 שניות עבודה 15 מנוחה'), [['ברפי', 1, null, 30, 15, null]]);
  assert.deepStrictEqual(rows('קפיצה בחבל 2 דקות 10 שניות'), [['קפיצה בחבל', 1, null, 130, null, null]]);
  assert.deepStrictEqual(rows('גשר 2x12 (3 שניות למעלה)'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('גשר 2x12 (3 שניות ירידה, 1 שנייה עלייה)'), [['גשר', 2, 12, null, null, '3 שניות ירידה · 1 שנייה עלייה']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 (טמפו 3-1-1)'), [['לחיצת חזה', 4, 8, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('מתח 3x8\nעד כשל'), [['מתח', 3, 8, null, null, null]]);
});
