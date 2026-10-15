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
    return [ex.name, ex.id, ex.sets, ex.reps, ex.duration_seconds];
  });
}

test('a slash between the counts is not part of the name', () => {
  // Was a clip-less «סופרמן /».
  assert.deepStrictEqual(rows('סופרמן 3 סטים / 12 חזרות'), [['סופרמן', 'superman', 3, 12, null]]);
  assert.deepStrictEqual(rows('סופרמן 3 סטים/12 חזרות'), [['סופרמן', 'superman', 3, 12, null]]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות / 3 סטים'), [['פלאנק', 'plank', 3, null, 30]]);
  assert.deepStrictEqual(rows('פלאנק / 30 שניות'), [['פלאנק', 'plank', 1, null, 30]]);
});

test('a slash before an inline rest is not part of the name', () => {
  const ex = Ingest.ingestText('סופרמן 3x10 / מנוחה 30', TH.catalog).workout.phases[1].exercises;
  assert.deepStrictEqual([ex[0].name, ex[0].id, ex[0].rest_seconds], ['סופרמן', 'superman', 30]);
});
