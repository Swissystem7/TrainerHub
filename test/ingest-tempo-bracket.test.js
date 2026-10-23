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

test('«גשר 2x12 (3 שניות למעלה)» is 2×12 with the tempo as a note, not a name «גשר למעלה» held 3 seconds', () => {
  // The bracket held a digit, so it was unwrapped into the line: the time became the duration
  // and the word rode into the name (a clip-less «גשר למעלה», «סקוואט למטה», «גשר החזקה של»).
  assert.deepStrictEqual(rows('גשר 2x12 (3 שניות למעלה)'), [['גשר', 2, 12, null, null, '3 שניות למעלה']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (2 שניות למטה)'), [['סקוואט', 3, 12, null, null, '2 שניות למטה']]);
  assert.deepStrictEqual(rows('גשר 2x12 (החזקה של 3 שניות)'), [['גשר', 2, 12, null, null, 'החזקה של 3 שניות']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (עצירה של 2 שניות למטה)'), [['סקוואט', 3, 12, null, null, 'עצירה של 2 שניות למטה']]);
  assert.deepStrictEqual(rows('פלאנק 3x30 שניות (5 שניות הרפיה בין)'), [['פלאנק', 3, null, 30, null, '5 שניות הרפיה בין']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (3 שניות לכל צד)'), [['סקוואט', 3, 12, null, null, '3 שניות לכל צד']]);
  assert.deepStrictEqual(rows('מתח 3x8 (3 שניות ירידה) מנוחה דקה'), [['מתח', 3, 8, null, 60, '3 שניות ירידה']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (2 שניות למטה) מנוחה 45 שניות'), [['סקוואט', 3, 12, null, 45, '2 שניות למטה']]);
});

test('«לחיצת חזה 4x8 (טמפו 3-1-1)» keeps its 8 reps, the tempo is a note and not a 3-rep ladder', () => {
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 (טמפו 3-1-1)'), [['לחיצת חזה', 4, 8, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (טמפו איטי)'), [['סקוואט', 3, 12, null, null, 'טמפו איטי']]);
});

test('a tempo bracket inside a rounds paste and after a comma piece parses with the paste', () => {
  assert.deepStrictEqual(rows('3 סבבים:\nסקוואט 12 (2 שניות למטה)\nגשר 15 (3 שניות למעלה)\nמנוחה 45 שניות'), [
    ['סקוואט', 3, 12, null, 45, '2 שניות למטה'],
    ['גשר', 3, 15, null, 45, '3 שניות למעלה']
  ]);
  assert.deepStrictEqual(rows('גשר 2x12 (3 שניות למעלה), לאנג׳ 10 לכל רגל'), [
    ['גשר', 2, 12, null, null, '3 שניות למעלה'],
    ['לאנג׳', 1, 10, null, null, 'לכל רגל']
  ]);
});

test('a bare time, a rest, a load, a per-side count and a time with no count outside are untouched', () => {
  // The bracket is the prescription when nothing outside is counted.
  assert.deepStrictEqual(rows('פלאנק 3 סטים (30 שניות)'), [['פלאנק', 3, null, 30, null, null]]);
  assert.deepStrictEqual(rows('פלאנק (30 שניות)'), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('לאנג׳ 3 סטים (12 לכל רגל)'), [['לאנג׳', 3, 12, null, null, 'לכל רגל']]);
  assert.deepStrictEqual(rows('סקוואט 12 (3 סטים)'), [['סקוואט', 3, 12, null, null, null]]);
  // A rest, a work time or a load in brackets next to a counted exercise keep their meaning.
  assert.deepStrictEqual(rows('סקוואט 3x12 (מנוחה 30 שניות)'), [['סקוואט', 3, 12, null, 30, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (2 דקות מנוחה)'), [['סקוואט', 3, 12, null, 120, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (עבודה 30 שניות)'), [['סקוואט', 3, 12, 30, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (60 ק"ג)'), [['סקוואט', 3, 12, null, null, '60 ק"ג']]);
  assert.deepStrictEqual(rows('סיבובים רוסים 3x20 (10 לכל צד)'), [['סיבובים רוסים', 3, 20, null, null, '10 לכל צד']]);
  assert.deepStrictEqual(rows('מתח 3x8 (עד כשל)'), [['מתח', 3, 8, null, null, 'עד כשל']]);
  // A real ladder is still a ladder.
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6'), [['לחיצת חזה', 3, 10, null, null, '10-8-6']]);
  assert.deepStrictEqual(rows('דדליפט 3 סטים: 8/6/4'), [['דדליפט', 3, 8, null, null, '8/6/4']]);
});
