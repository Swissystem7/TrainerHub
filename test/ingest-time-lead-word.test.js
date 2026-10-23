'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises
    .map(function (ex) { return [ex.name, ex.sets, ex.reps, ex.duration_seconds]; });
}

test('the word that leads into the time is not part of the exercise name', () => {
  // Were «ריצה של» / «הליכה של» / «פלאנק למשך» / «ריצה במשך» / «ריצה כ» / «ריצה קלה של כ».
  assert.deepStrictEqual(rows('ריצה של 30 דקות'), [['ריצה', 1, null, 1800]]);
  assert.deepStrictEqual(rows('הליכה של 20 דקות'), [['הליכה', 1, null, 1200]]);
  assert.deepStrictEqual(rows('פלאנק של 30 שניות'), [['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('פלאנק למשך 30 שניות'), [['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('ריצה במשך 20 דקות'), [['ריצה', 1, null, 1200]]);
  assert.deepStrictEqual(rows('ריצה כ-20 דקות'), [['ריצה', 1, null, 1200]]);
  assert.deepStrictEqual(rows('ריצה קלה של כ-20 דקות'), [['ריצה קלה', 1, null, 1200]]);
  assert.deepStrictEqual(rows('ריצה של 5 דקות\nסקוואט 3x12'), [['ריצה', 1, null, 300], ['סקוואט', 3, 12, null]]);
});

test('a name that only holds such a word inside is untouched', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12 של המשקל'), [['סקוואט של המשקל', 3, 12, null]]);
  assert.deepStrictEqual(rows('ריצה 30 דקות'), [['ריצה', 1, null, 1800]]);
  assert.deepStrictEqual(rows('סקוואט 3 סטים של 12'), [['סקוואט', 3, 12, null]]);
});
