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

test('«מנוחה 1\'» is a minute of rest, not one second', () => {
  // The tick after the number was not a unit, so the bare «1» was read as seconds.
  assert.deepStrictEqual(rows('סקוואט 12\nמנוחה 1\''), [['סקוואט', 1, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 12\nמנוחה 2׳'), [['סקוואט', 1, 12, null, 120, null]]);
  assert.deepStrictEqual(rows('סקוואט 12\nמנוחה: 1\''), [['סקוואט', 1, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 12 מנוחה 1\''), [['סקוואט', 1, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה 1׳'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('סקוואט 12\nלאנג׳ 10\nמנוחה 1\' בין הסטים'), [
    ['סקוואט', 1, 12, null, 60, null],
    ['לאנג׳', 1, 10, null, 60, null]
  ]);
  // A minute and a half of rest, as a tick pair or written out (was 60 s: the seconds were dropped).
  assert.deepStrictEqual(rows('סקוואט 12\nמנוחה 1\' 30"'), [['סקוואט', 1, 12, null, 90, null]]);
  assert.deepStrictEqual(rows('סקוואט 12\nמנוחה 1 דקה ו-30 שניות'), [['סקוואט', 1, 12, null, 90, null]]);
});

test('«פלאנק 1\'» is a minute of work, not a name «פלאנק 1\'» with 10 invented reps', () => {
  assert.deepStrictEqual(rows('פלאנק 1\''), [['פלאנק', 1, null, 60, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 2׳'), [['פלאנק', 1, null, 120, null, null]]);
  assert.deepStrictEqual(rows('ריצה 10\''), [['ריצה', 1, null, 600, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 1.5\''), [['פלאנק', 1, null, 90, null, null]]);
  // «1' 30"» / «1'30"» is a minute and a half (was 30 s: only the seconds mark was read).
  assert.deepStrictEqual(rows('פלאנק 1\' 30"'), [['פלאנק', 1, null, 90, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 1\'30"'), [['פלאנק', 1, null, 90, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 1′ 30″'), [['פלאנק', 1, null, 90, null, null]]);
  // Seconds marks still work, including the doubled apostrophe and a range.
  assert.deepStrictEqual(rows('פלאנק 30"'), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 30\'\''), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 30"-45"'), [['פלאנק', 1, null, 30, null, '30-45 שניות']]);
});

test('«פלאנק 3x1\'» and «פלאנק 3x2 דקות» are sets of minutes, not a name «פלאנק דקות»', () => {
  // «3x1′» was 3 × 1 s (the prime was taken as a seconds mark); «3x2 דקות» was 3 × 2 reps named «פלאנק דקות».
  assert.deepStrictEqual(rows('פלאנק 3x1\''), [['פלאנק', 3, null, 60, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3x1′'), [['פלאנק', 3, null, 60, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3x2 דקות'), [['פלאנק', 3, null, 120, null, null]]);
  assert.deepStrictEqual(rows('ריצה 1\'x3'), [['ריצה', 3, null, 60, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3x30"'), [['פלאנק', 3, null, 30, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3/30"'), [['פלאנק', 3, null, 30, null, null]]);
});

test('a tick after a letter, a load, a minute rest after reps and a word form are untouched', () => {
  assert.deepStrictEqual(rows('לאנג׳ 3x10'), [['לאנג׳', 3, 10, null, null, null]]);
  assert.deepStrictEqual(rows('ג\'אמפינג ג\'קס 20'), [['ג\'אמפינג ג\'קס', 1, 20, null, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 3 דק׳'), [['סקוואט', 1, null, 180, null, null]]);
  assert.deepStrictEqual(rows('ריצה 5 מ\''), [['ריצה', 1, null, null, null, '5 מטר']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 60 ק"ג'), [['סקוואט', 3, 12, null, null, '60 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 דקה מנוחה'), [['סקוואט', 3, 12, null, 60, null]]);
  assert.deepStrictEqual(rows('ריצה 2 דקות 30 שניות מנוחה'), [['ריצה', 1, null, 120, 30, null]]);
  assert.deepStrictEqual(rows('פלאנק 1/2 דקה'), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 12\nסה"כ 25 דקות'), [['סקוואט', 1, 12, null, null, null]]);
});
