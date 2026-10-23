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

test('«מנוחות של 45 שניות» on its own line is every exercise\'s rest, not an exercise «מנוחות של»', () => {
  // The plural was not a rest word, so the line was a clip-less 45-second exercise and nobody rested.
  assert.deepStrictEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחות של 45 שניות'), [
    ['סקוואט', 3, 12, null, 45, null],
    ['לאנג׳', 3, 10, null, 45, null]
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחות 45 שניות'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחות של 45 שניות בין הסטים'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחות של 45 שניות בין התרגילים'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nהפסקות של דקה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nהפסקות: 1:30'), [['סקוואט', 3, 12, null, 90, null]]);
  assert.deepStrictEqual(rows('3 סבבים:\nסקוואט 15\nבטן 20\nמנוחות של 2 דקות בין הסבבים'), [
    ['סקוואט', 3, 15, null, 120, null],
    ['בטן', 3, 20, null, 120, null]
  ]);
});

test('«סקוואט 3x12 מנוחות של 45 שניות» keeps its name and takes the rest, inline or after a comma', () => {
  // Inline, the plural rode into the name («סקוואט מנוחות של») and the 45 s became the exercise's time.
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחות של 45 שניות'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12, מנוחות של 45 שניות'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('ברפי 40 שניות 20 הפסקות'), [['ברפי', 1, null, 40, 20, null]]);
});

test('a plural rest word with no time, or with a plural adjective, rests as the singular does', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחות'), rows('סקוואט 3x12\nמנוחה'));
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחות קצרות'), rows('סקוואט 3x12\nמנוחה קצרה'));
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחות קצרות'), [['סקוואט', 3, 12, null, 60, null]]);
});

test('the singular forms and an exercise with a rest clause are untouched', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 45 שניות'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nהפסקה של דקה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('לאנג׳ 10 חזרות מנוחה 30 שניות'), [['לאנג׳', 1, 10, null, 30, null]]);
  assert.deepStrictEqual(rows('סקוואט 30 שניות עבודה 15 שניות מנוחה\nברפי 30 שניות'), [
    ['סקוואט', 1, null, 30, 15, null],
    ['ברפי', 1, null, 30, 15, null]
  ]);
});
