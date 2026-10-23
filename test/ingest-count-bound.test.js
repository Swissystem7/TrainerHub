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
    .map(function (ex) { return [ex.name, ex.id, ex.sets, ex.reps, ex.duration_seconds, String(ex.notes || '').replace(/ · חסר סרטון$|^חסר סרטון$/, '')]; });
}

test('a bound on the count is a note, not part of the exercise name', () => {
  // Were clip-less «שכיבות סמיכה לפחות» / «שכיבות סמיכה עד» / «שכיבות סמיכה מינימום».
  assert.deepStrictEqual(rows('שכיבות סמיכה לפחות 15'), [['שכיבות סמיכה', 'אתגר_שכיבות_שמיכה', 1, 15, null, 'לפחות 15']]);
  assert.deepStrictEqual(rows('שכיבות סמיכה עד 20'), [['שכיבות סמיכה', 'אתגר_שכיבות_שמיכה', 1, 20, null, 'עד 20']]);
  assert.deepStrictEqual(rows('שכיבות סמיכה 3x מינימום 10'), [['שכיבות סמיכה', 'אתגר_שכיבות_שמיכה', 3, 10, null, 'מינימום 10']]);
  // Were «פלאנק לפחות» / «פלאנק עד» on the plank clip, «ריצה לפחות» / «ריצה עד».
  assert.deepStrictEqual(rows('פלאנק לפחות 30 שניות'), [['פלאנק', 'plank', 1, null, 30, 'לפחות 30 שניות']]);
  assert.deepStrictEqual(rows('פלאנק עד 60 שניות'), [['פלאנק', 'plank', 1, null, 60, 'עד 60 שניות']]);
  assert.deepStrictEqual(rows('פלאנק 3 סטים של לפחות 30 שניות'), [['פלאנק', 'plank', 3, null, 30, 'לפחות 30 שניות']]);
  assert.deepStrictEqual(rows('ריצה לפחות 20 דקות'), [['ריצה', null, 1, null, 1200, 'לפחות 20 דקות']]);
  assert.deepStrictEqual(rows('ריצה עד 20 דקות'), [['ריצה', null, 1, null, 1200, 'עד 20 דקות']]);
  // After the count.
  assert.deepStrictEqual(rows('ריצה 20 דקות לפחות'), [['ריצה', null, 1, null, 1200, 'לפחות']]);
});

test('the lead-in word before a distance is not part of the name', () => {
  // Were «ריצה במשך» / «ריצה של».
  assert.deepStrictEqual(rows('ריצה במשך 5 ק"מ'), [['ריצה', null, 1, null, null, '5 ק"מ']]);
  assert.deepStrictEqual(rows('ריצה של 5 ק"מ'), [['ריצה', null, 1, null, null, '5 ק"מ']]);
});

test('to failure and plain counts are untouched', () => {
  assert.deepStrictEqual(rows('שכיבות סמיכה 15'), [['שכיבות סמיכה', 'אתגר_שכיבות_שמיכה', 1, 15, null, '']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 עד כשל'), [['סקוואט', null, 3, 12, null, 'עד כשל']]);
  assert.deepStrictEqual(rows('ריצה עד כשל'), [['ריצה', null, 1, null, null, 'עד כשל']]);
  assert.deepStrictEqual(rows('שכיבות סמיכה מקסימום 20'), [['שכיבות סמיכה', 'אתגר_שכיבות_שמיכה', 1, 20, null, 'עד כשל']]);
});
