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

test('a lone «xN» with no other count is the reps', () => {
  // Was 15 sets of an invented 10 reps.
  assert.deepStrictEqual(rows('סופרמן x15'), [['סופרמן', 'superman', 1, 15, null]]);
  assert.deepStrictEqual(rows('סופרמן ×12'), [['סופרמן', 'superman', 1, 12, null]]);
  assert.deepStrictEqual(rows('סופרמן X 20'), [['סופרמן', 'superman', 1, 20, null]]);
});

test('under a rounds header the rounds stay the sets', () => {
  // Was sets 15 - the x15 overrode «3 סבבים».
  assert.deepStrictEqual(rows('3 סבבים:\nסופרמן x15\nפלאנק 30 שניות'),
    [['סופרמן', 'superman', 3, 15, null], ['פלאנק', 'plank', 3, null, 30]]);
});

test('next to another count the multiplier is still the sets', () => {
  assert.deepStrictEqual(rows('פלאנק 45 שניות x3'), [['פלאנק', 'plank', 3, null, 45]]);
  assert.deepStrictEqual(rows('x3 סופרמן 12'), [['סופרמן', 'superman', 3, 12, null]]);
  assert.deepStrictEqual(rows('סופרמן 12 חזרות x3'), [['סופרמן', 'superman', 3, 12, null]]);
  assert.deepStrictEqual(rows('סופרמן עד כשל x3'), [['סופרמן', 'superman', 3, null, null]]);
});
