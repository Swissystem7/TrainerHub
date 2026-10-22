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
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('a numbered section label before a comma list is dropped from the first name', () => {
  // Was «סבב 1 סקוואט» / «סבב 2 דדליפט»: the label could not hold a digit.
  assert.deepStrictEqual(rows('סבב 1: סקוואט 12, לחיצת חזה 10\nסבב 2: דדליפט 8, מתח 6'), [
    ['סקוואט', 1, 12, null], ['לחיצת חזה', 1, 10, null], ['דדליפט', 1, 8, null], ['מתח', 1, 6, null]
  ]);
  assert.deepStrictEqual(rows('תחנה 1: סקוואט 12\nתחנה 2: מתח 8'), [['סקוואט', 1, 12, null], ['מתח', 1, 8, null]]);
  assert.deepStrictEqual(rows('שלב 2: מתח 8\nפלאנק: 30 שניות'), [['מתח', 1, 8, null], ['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('שבוע 1: סקוואט 3x12'), [['סקוואט', 3, 12, null]]);
});

test('a section label may introduce a count: «סבב 1: 10 ברפי»', () => {
  // Was «סבב 1 10 ברפי» with 10 invented reps.
  assert.deepStrictEqual(rows('סבב 1: 10 ברפי, 15 סקוואט\nסבב 2: 8 ברפי, 12 סקוואט'), [
    ['ברפי', 1, 10, null], ['סקוואט', 1, 15, null], ['ברפי', 1, 8, null], ['סקוואט', 1, 12, null]
  ]);
});

test('a day label «יום ב:» / «יום 2:» / «יום שני:» is a header, not part of the name', () => {
  // «יום א:» on the first line was dropped as the title while «יום ב» stayed in the name «יום ב מתח».
  assert.deepStrictEqual(rows('יום א: סקוואט 3x12\nיום ב: מתח 3x8'), [['סקוואט', 3, 12, null], ['מתח', 3, 8, null]]);
  assert.deepStrictEqual(rows('יום 1: סקוואט 3x12\nיום 2: מתח 3x8'), [['סקוואט', 3, 12, null], ['מתח', 3, 8, null]]);
  assert.deepStrictEqual(rows('יום ראשון: סקוואט 3x12\nיום שני: מתח 3x8'), [['סקוואט', 3, 12, null], ['מתח', 3, 8, null]]);
  // A day on its own line was a phantom exercise «יום ב».
  assert.deepStrictEqual(rows('סקוואט 3x12\nיום ב\nמתח 3x8'), [['סקוואט', 3, 12, null], ['מתח', 3, 8, null]]);
});

test('a title word before a count and a clock rest stay whole', () => {
  assert.deepStrictEqual(rows('חימום: 5 דקות ריצה\nסקוואט 3x12'), [['חימום ריצה', 1, null, 300], ['סקוואט', 3, 12, null]]);
  const r = Ingest.ingestText('סקוואט 3x12\nמנוחה 1:30\nמתח 3x8').workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.rest_seconds]));
  assert.deepStrictEqual(r, [['סקוואט', 90], ['מתח', 90]]);
});
