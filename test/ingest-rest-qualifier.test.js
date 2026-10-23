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

test('«מנוחה מינימלית» on its own line is a rest line, not an exercise «מינימלית»', () => {
  // The qualifier was a clip-less exercise «מינימלית» / «מלאה» / «לפי הצורך» of 10 invented reps;
  // the line rests the exercise before it with the default 60 s, as «מנוחה קצרה» does.
  assert.deepStrictEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה מינימלית'), [
    ['סקוואט', 3, 12, null, null, null],
    ['לאנג׳', 3, 10, null, 60, null]
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה מינימלית בין התרגילים'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה מלאה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה לפי הצורך'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה כמה שצריך בין הסטים'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה קצרה ככל האפשר'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה עד התאוששות מלאה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nהפסקה חופשית'), [['סקוואט', 3, 12, null, 60, null]]);
});

test('«מנוחה של מינימום 2 דקות» / «מנוחה לפחות דקה» / «מנוחה עד 90 שניות» are a timed rest for every exercise', () => {
  // The bound before the time left a phantom «מינימום» and nobody rested.
  assert.deepStrictEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה של מינימום 2 דקות'), [
    ['סקוואט', 3, 12, null, 120, null],
    ['לאנג׳', 3, 10, null, 120, null]
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה לפחות דקה'), [
    ['סקוואט', 3, 12, null, 60, null],
    ['לאנג׳', 3, 10, null, 60, null]
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה עד 90 שניות'), [
    ['סקוואט', 3, 12, null, 90, null],
    ['לאנג׳', 3, 10, null, 90, null]
  ]);
});

test('«סקוואט 3x12 מנוחה מינימלית» keeps its name and its 3×12, inline or after a comma', () => {
  // Inline the qualifier rode into the name («סקוואט מינימלית») and the pair broke to 1×3 with 12 s of rest.
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה מינימלית\nלאנג׳ 3x10'), [
    ['סקוואט', 3, 12, null, null, null],
    ['לאנג׳', 3, 10, null, null, null]
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12, מנוחה מינימלית'), [['סקוואט', 3, 12, null, 60, null]]);
});

test('«סקוואט 3x12 מנוחה» is 3×12, not one set of 3 with 12 seconds of rest', () => {
  // The bare number before the rest word was taken as its seconds even when it was the reps of the pair.
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה'), [['סקוואט', 3, 12, null, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה קצרה'), [['סקוואט', 3, 12, null, null, null]]);
  assert.deepStrictEqual(rows('שכיבות 10x3 מנוחה'), [['שכיבות', 10, 3, null, null, null]]);
  // A bare number of its own before the rest word is still its seconds, and a stated time still wins.
  assert.deepStrictEqual(rows('ברפי 40 שניות 20 מנוחה'), [['ברפי', 1, null, 40, 20, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה 30'), [['סקוואט', 3, 12, null, 30, null]]);
});

test('«מנוחה קצרה», «מנוחה 45 שניות», «מנוחה שלוש דקות» and «עד כשל» are untouched', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה קצרה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 45 שניות'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה שלוש דקות'), [['סקוואט', 3, 12, null, 180, null]]);
  assert.deepStrictEqual(rows('מתח 3x8\nעד כשל'), [['מתח', 3, 8, null, null, null]]);
});
