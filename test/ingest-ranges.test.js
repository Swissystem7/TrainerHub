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
    return [ex.name, ex.id, ex.sets, ex.reps, ex.duration_seconds, ex.notes];
  });
}

test('a rep range keeps the lower bound and the range goes to the notes', () => {
  // Was the name «כתפיים וגב 10 12» with no clip and 10 invented reps.
  assert.deepStrictEqual(rows('כתפיים וגב 10-12'), [['כתפיים וגב', 'כתפיים_וגב', 1, 10, null, '10-12']]);
  assert.deepStrictEqual(rows('סופרמן 3x10–12'), [['סופרמן', 'superman', 3, 10, null, '10-12']]);
  // Was the name «סופרמן 8» with reps 12.
  assert.deepStrictEqual(rows('סופרמן 8-12 חזרות'), [['סופרמן', 'superman', 1, 8, null, '8-12 חזרות']]);
  assert.deepStrictEqual(rows('סופרמן 8 עד 12 חזרות'), [['סופרמן', 'superman', 1, 8, null, '8-12 חזרות']]);
  assert.deepStrictEqual(rows('סופרמן 3-4 סטים 12'), [['סופרמן', 'superman', 3, 12, null, '3-4 סטים']]);
});

test('a time range keeps the shorter time', () => {
  // Was the name «פלאנק 30» with 45 seconds.
  assert.deepStrictEqual(rows('פלאנק 30-45 שניות'), [['פלאנק', 'plank', 1, null, 30, '30-45 שניות']]);
  // Was the name «פלאנק 1 30».
  assert.deepStrictEqual(rows('פלאנק 1:00-1:30'), [['פלאנק', 'plank', 1, null, 60, '1:00-1:30']]);
});

test('«פעמים» is a rep count', () => {
  // Was the name «סופרמן 12 פעמים» with no clip and 10 invented reps.
  assert.deepStrictEqual(rows('סופרמן 12 פעמים'), [['סופרמן', 'superman', 1, 12, null, null]]);
  // Was the name «סופרמן פעמים».
  assert.deepStrictEqual(rows('סופרמן 3 סטים 12 פעמים'), [['סופרמן', 'superman', 3, 12, null, null]]);
  assert.deepStrictEqual(rows('סופרמן 3x12 פעמים'), [['סופרמן', 'superman', 3, 12, null, null]]);
});

test('a hyphen that is not a range is left alone', () => {
  assert.deepStrictEqual(rows('סופרמן 15 - לאט'), [['סופרמן', 'superman', 1, 15, null, 'לאט']]);
  assert.deepStrictEqual(rows('פלאנק 1:30'), [['פלאנק', 'plank', 1, null, 90, null]]);
});
