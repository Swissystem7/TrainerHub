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

test('«בלי מנוחה» on its own line is a rest of 0 for every exercise, not an exercise «בלי»', () => {
  // The line was a clip-less exercise «בלי» (or «ללא» / «אין») of 10 invented reps and nobody's rest changed.
  assert.deepStrictEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nבלי מנוחה'), [
    ['סקוואט', 3, 12, null, 0, null],
    ['לאנג׳', 3, 10, null, 0, null]
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nללא מנוחה'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nללא הפסקות'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nאין מנוחה בכלל'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nבלי מנוחה בין הסטים'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nבלי הפסקות בין התרגילים'), [['סקוואט', 3, 12, null, 0, null]]);
  // A later «בלי מנוחה» rests the exercise before it, as a timed rest line does (the paste's 30 s stays the default).
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 30 שניות\nלאנג׳ 3x10\nבלי מנוחה\nפלאנק 30 שניות'), [
    ['סקוואט', 3, 12, null, 30, null],
    ['לאנג׳', 3, 10, null, 0, null],
    ['פלאנק', 1, null, 30, 30, null]
  ]);
});

test('«סקוואט 3x12 בלי מנוחה» keeps its name and rests 0, inline or after a comma', () => {
  // Inline the clause rode into the name («סקוואט בלי»); after a comma it was a second exercise «בלי».
  assert.deepStrictEqual(rows('סקוואט 3x12 בלי מנוחה'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 ללא מנוחה בין הסטים'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12, בלי מנוחה'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nללא מנוחה, לאנג׳ 3x10'), [
    ['סקוואט', 3, 12, null, 0, null],
    ['לאנג׳', 3, 10, null, 0, null]
  ]);
});

test('«3 סבבים בלי מנוחה:» and «סופרסט בלי מנוחה:» are headers of a no-rest block, not an exercise «בלי» of 3 sets', () => {
  assert.deepStrictEqual(rows('3 סבבים בלי מנוחה:\nסקוואט 15\nבטן 20'), [
    ['סקוואט', 3, 15, null, 0, null],
    ['בטן', 3, 20, null, 0, null]
  ]);
  assert.deepStrictEqual(rows('סופרסט בלי מנוחה:\nסקוואט 12\nלאנג׳ 10'), [
    ['סקוואט', 1, 12, null, 0, null],
    ['לאנג׳', 1, 10, null, 0, null]
  ]);
  // The rest between the rounds wins over the no-rest between the exercises.
  assert.deepStrictEqual(rows('סקוואט 15\nבטן 20\nבלי מנוחה בין התרגילים, מנוחה 2 דקות בין הסבבים'), [
    ['סקוואט', 1, 15, null, 120, null],
    ['בטן', 1, 20, null, 120, null]
  ]);
});

test('«מנוחה 0» is a rest of 0, not the default 60; the cue «בלי לנעול ברכיים» and a plain rest line are untouched', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 0'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 0 שניות'), [['סקוואט', 3, 12, null, 0, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (בלי לנעול ברכיים)'), [['סקוואט', 3, 12, null, null, 'בלי לנעול ברכיים']]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 45 שניות'), [['סקוואט', 3, 12, null, 45, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה קצרה'), [['סקוואט', 3, 12, null, 60, null]]);
});
