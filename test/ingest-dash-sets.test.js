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

test('«סקוואט 15 - 3 סטים» is 3 sets of 15, not a name «סקוואט 15» with 10 invented reps', () => {
  assert.deepEqual(rows('סקוואט 15 - 3 סטים'), [['סקוואט', 3, 15, null]]);
  assert.deepEqual(rows('סקוואט 15 – 3 סבבים'), [['סקוואט', 3, 15, null]]);
  assert.deepEqual(rows('סקוואט - 15 - 3 סטים'), [['סקוואט', 3, 15, null]]);
  assert.deepEqual(rows('שכיבות סמיכה 10 - 3 סטים'), [['שכיבות סמיכה', 3, 10, null]]);
});

test('the last piece of a circuit with «- 4 סבבים» keeps its count', () => {
  assert.deepEqual(rows('שכיבות סמיכה 10, סקוואט 15, ברפי 5 - 4 סבבים'), [
    ['שכיבות סמיכה', 4, 10, null],
    ['סקוואט', 4, 15, null],
    ['ברפי', 4, 5, null]
  ]);
});

test('lines without the dash are untouched', () => {
  assert.deepEqual(rows('סקוואט 15 חזרות - 3 סטים'), [['סקוואט', 3, 15, null]]);
  assert.deepEqual(rows('ברפי 5, 4 סבבים'), [['ברפי', 4, 5, null]]);
  assert.deepEqual(rows('סקוואט 3x12'), [['סקוואט', 3, 12, null]]);
});
