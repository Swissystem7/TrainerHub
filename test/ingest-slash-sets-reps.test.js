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

test('«N/M» after the name is sets/reps, like «NxM»', () => {
  // Was a clip-less «סופרמן 3/10» with 10 invented reps.
  assert.deepStrictEqual(rows('סופרמן 3/10'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('סופרמן 3 / 10'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('סופרמן 3/10 חזרות'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('פלאנק 3/30 שניות'), [['פלאנק', 'plank', 3, null, 30]]);
  assert.deepStrictEqual(rows('פלאנק 3/30"'), [['פלאנק', 'plank', 3, null, 30]]);
  assert.deepStrictEqual(rows('סופרמן 3/10, פלאנק 3/30״'), [
    ['סופרמן', 'superman', 3, 10, null],
    ['פלאנק', 'plank', 3, null, 30]
  ]);
});

test('half a minute is still half a minute', () => {
  assert.deepStrictEqual(rows('פלאנק 1/2 דקה'), [['פלאנק', 'plank', 1, null, 30]]);
  assert.deepStrictEqual(rows('פלאנק דקה ו-1/2'), [['פלאנק', 'plank', 1, null, 90]]);
});

test('an inline rest after «N/M» is kept', () => {
  const ex = Ingest.ingestText('סופרמן 3/10 מנוחה 30', TH.catalog).workout.phases[1].exercises;
  assert.deepStrictEqual([ex[0].id, ex[0].sets, ex[0].reps, ex[0].rest_seconds], ['superman', 3, 10, 30]);
});
