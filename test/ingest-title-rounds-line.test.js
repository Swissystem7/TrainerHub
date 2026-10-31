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
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises.map((ex) => [ex.name, ex.sets, ex.reps]);
}

test('a title line with the rounds is not an exercise', () => {
  // Was a phantom «אימון רגליים» of 3x10 invented reps before the real exercises.
  assert.deepStrictEqual(rows('אימון רגליים - 3 סבבים\nסקוואט 15\nלאנג׳ 12'), [
    ['סקוואט', 3, 15],
    ['לאנג׳', 3, 12]
  ]);
  assert.deepStrictEqual(rows('אימון רגליים 3 סבבים\nסקוואט 15'), [['סקוואט', 3, 15]]);
  assert.deepStrictEqual(rows('*אימון גוף מלא – 4 סבבים*\nסקוואט 15\nברפי 10'), [
    ['סקוואט', 4, 15],
    ['ברפי', 4, 10]
  ]);
});

test('a clip title with the rounds stays the clip', () => {
  assert.deepStrictEqual(rows('אימון קונוסים 3 סבבים\nסקוואט 15')[0], ['אימון קונוסים', 3, 10]);
});
