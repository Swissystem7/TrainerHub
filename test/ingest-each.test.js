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

test('«כל אחד» / «כל פעם» / «לכל סט» after a count is filler, not part of the name', () => {
  // Were a name «שכיבות סמיכה 15 כל אחד» with 10 invented reps, «סקוואט כל אחד» 3x12, «פלאנק כל אחד».
  assert.deepStrictEqual(rows('שכיבות סמיכה 15 כל אחד'), [['שכיבות סמיכה', 1, 15, null]]);
  assert.deepStrictEqual(rows('שכיבות סמיכה 15 כל אחת'), [['שכיבות סמיכה', 1, 15, null]]);
  assert.deepStrictEqual(rows('שכיבות סמיכה 15 כל פעם'), [['שכיבות סמיכה', 1, 15, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 כל אחד'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 3 סטים של 12 כל אחד'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות כל אחד'), [['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 12 לכל סט'), [['סקוואט', 1, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 12 כל אחד, לאנג׳ 10 כל אחד'), [['סקוואט', 1, 12, null], ['לאנג׳', 1, 10, null]]);
});

test('«כל אחד» after a list of names gives every name the count', () => {
  // Was 3x12 for «גשר כל אחד» only, the names before it with 10 invented reps each.
  assert.deepStrictEqual(rows('סקוואט, לאנג׳, גשר - 3x12 כל אחד'),
    [['סקוואט', 3, 12, null], ['לאנג׳', 3, 12, null], ['גשר', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט ולאנג׳ 3x12 כל אחד'), [['סקוואט', 3, 12, null], ['לאנג׳', 3, 12, null]]);
  assert.deepStrictEqual(rows('חימום, מתיחות 5 דקות כל אחד'), [['חימום', 1, null, 300], ['מתיחות', 1, null, 300]]);
});

test('without «כל אחד», or with counts on the earlier names, nothing is shared', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12 (כל אחד בקצב שלו)').map(r => r[0]), ['סקוואט']);
  const mixed = rows('סקוואט, לאנג׳ 3x12, גשר 10 כל אחד');
  assert.deepStrictEqual(mixed[1], ['לאנג׳', 3, 12, null]);
  assert.deepStrictEqual(mixed[2], ['גשר', 1, 10, null]);
  assert.deepStrictEqual(rows('סקוואט, לאנג׳, גשר 3x12')[0][2], 10);
});
