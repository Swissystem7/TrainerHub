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

test('«סקוואט 3x12 טמפו 3-1-1» is 3×12 with the tempo as a note, not a name «סקוואט טמפו» of 3×3', () => {
  // The bare code was read as a 3-rep ladder (3 sets, reps 3, note «3-1-1») and «טמפו» rode into the
  // name, so no clip was matched; only the bracketed «(טמפו 3-1-1)» was a note (#329).
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3-1-1'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 טמפו 3-1-1-0'), [['לחיצת חזה', 4, 8, null, null, 'טמפו 3-1-1-0']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 בטמפו 3-1-1'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 tempo 3-1-1'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3 - 1 - 1'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 טמפו 2-0-2 מנוחה 90 שניות'), [['דדליפט', 5, 5, null, 90, 'טמפו 2-0-2']]);
});

test('«טמפו 3:1:1», «טמפו 31X0» and «טמפו איטי» are tempo notes too', () => {
  // Were names «סקוואט טמפו 3 1 1», «סקוואט טמפו 31 0», «סקוואט טמפו איטי».
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3:1:1'), [['סקוואט', 3, 12, null, null, 'טמפו 3:1:1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 31X0'), [['סקוואט', 3, 12, null, null, 'טמפו 31X0']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3010'), [['סקוואט', 3, 12, null, null, 'טמפו 3010']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו איטי'), [['סקוואט', 3, 12, null, null, 'טמפו איטי']]);
});

test('the tempo after a dash or a comma rides on its exercise, a lone tempo line is dropped', () => {
  // «- טמפו 3-1-1» left two notes «3-1-1 · טמפו»; «, טמפו 3-1-1» was a second exercise «טמפו» of 3×3.
  assert.deepStrictEqual(rows('סקוואט 3x12 - טמפו 3-1-1'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12, טמפו 3-1-1'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3-1-1, פלאנק 30 שניות'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1'], ['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3-1-1 (לאט)'), [['סקוואט', 3, 12, null, null, 'לאט · טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו 3-1-1 RPE 8'), [['סקוואט', 3, 12, null, null, 'טמפו 3-1-1 · RPE 8']]);
  assert.deepStrictEqual(rows('טמפו 3-1-1'), []);
});

test('a tempo run, a ladder, the bracketed tempo and a bare «טמפו» are as they were', () => {
  assert.deepStrictEqual(rows('ריצת טמפו 400 מטר'), [['ריצת טמפו', 1, null, null, null, '400 מטר']]);
  assert.deepStrictEqual(rows('ריצת טמפו 1000 מטר x3'), [['ריצת טמפו', 3, null, null, null, '1000 מטר']]);
  assert.deepStrictEqual(rows('ריצת טמפו 20 דקות'), [['ריצת טמפו', 1, null, 1200, null, null]]);
  assert.deepStrictEqual(rows('ריצת טמפו 10-12 דקות'), [['ריצת טמפו', 1, null, 600, null, '10-12 דקות']]);
  assert.deepStrictEqual(rows('טמפו ראן 5 ק"מ'), [['טמפו ראן', 1, null, null, null, '5 ק"מ']]);
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6'), [['לחיצת חזה', 3, 10, null, null, '10-8-6']]);
  assert.deepStrictEqual(rows('סקוואט 5-5-5-5-5'), [['סקוואט', 5, 5, null, null, '5-5-5-5-5']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 (טמפו 3-1-1)'), [['לחיצת חזה', 4, 8, null, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 טמפו'), [['סקוואט טמפו', 3, 12, null, null, null]]);
});
