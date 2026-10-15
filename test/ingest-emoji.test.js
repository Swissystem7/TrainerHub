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

test('an emoji on the line does not stay in the name', () => {
  // Was the name «סופרמן 💪» with no clip.
  assert.deepStrictEqual(rows('סופרמן 3x10 💪'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('💪 סופרמן 3x10'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('סופרמן 3x10 👍🏽'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('סופרמן 3×10 ❤️'), [['סופרמן', 'superman', 3, 10, null]]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות ✅'), [['פלאנק', 'plank', 1, null, 30]]);
});

test('a trailing emoji does not hide the rep count', () => {
  // Was the name «סקוואט 15 🔥» with 10 invented reps.
  assert.deepStrictEqual(rows('סקוואט 15 🔥'), [['סקוואט', null, 1, 15, null]]);
});

test('keycap numbers are list numbering and an emoji-only line is skipped', () => {
  assert.deepStrictEqual(rows('1️⃣ סופרמן 3x10\n2️⃣ פלאנק 30 שניות'), [
    ['סופרמן', 'superman', 3, 10, null],
    ['פלאנק', 'plank', 1, null, 30]
  ]);
  assert.deepStrictEqual(rows('🔥🔥🔥\nסופרמן 3x10'), [['סופרמן', 'superman', 3, 10, null]]);
});
