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
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises.map(function (ex) {
    return [ex.name, ex.sets, ex.reps, ex.duration_seconds];
  });
}

test('a trailing «X3» line is the rounds of the whole list', () => {
  // Was dropped: every exercise stayed 1 set.
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\nפלאנק 30 שניות\nX3'),
    [['סקוואט', 3, 15, null], ['סופרמן', 3, 12, null], ['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\n×3'), [['סקוואט', 3, 15, null], ['סופרמן', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\n3 פעמים'), [['סקוואט', 3, 15, null], ['סופרמן', 3, 12, null]]);
  assert.deepStrictEqual(rows('x4\nסקוואט 15\nסופרמן 12'), [['סקוואט', 4, 15, null], ['סופרמן', 4, 12, null]]);
});

test('«לחזור 3 פעמים» / «הכל x3» / «לבצע 3 סבבים» are not exercises', () => {
  // Were phantom exercises «לחזור», «הכל», «לבצע».
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\nלחזור 3 פעמים'), [['סקוואט', 3, 15, null], ['סופרמן', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\nהכל x3'), [['סקוואט', 3, 15, null], ['סופרמן', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\nלבצע 3 סבבים'), [['סקוואט', 3, 15, null], ['סופרמן', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 15\nסופרמן 12\nפעמיים'), [['סקוואט', 2, 15, null], ['סופרמן', 2, 12, null]]);
});

test('an exercise\'s own sets win over the rounds line; multipliers on an exercise line are untouched', () => {
  assert.deepStrictEqual(rows('סקוואט 4x10\nסופרמן 12\nx3'), [['סקוואט', 4, 10, null], ['סופרמן', 3, 12, null]]);
  assert.deepStrictEqual(rows('סופרמן x15'), [['סופרמן', 1, 15, null]]);
  assert.deepStrictEqual(rows('פלאנק 45 שניות x3'), [['פלאנק', 3, null, 45]]);
});
