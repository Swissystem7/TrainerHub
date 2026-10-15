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

function all(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises.map(function (ex) {
    return { name: ex.name, id: ex.id, sets: ex.sets, reps: ex.reps, duration_seconds: ex.duration_seconds, notes: ex.notes };
  });
}


test('an asterisk between two numbers is the sets multiplier', () => {
  // Was «סופרמן 4*10»: 1 set of 10, no clip.
  assert.deepStrictEqual(all('סופרמן 4*10'),
    [{ name: 'סופרמן', id: 'superman', sets: 4, reps: 10, duration_seconds: null, notes: null }]);
  // Was «סופרמן 4 *» with 10 reps.
  assert.deepStrictEqual(all('סופרמן 4 * 10').map((e) => [e.id, e.sets, e.reps]), [['superman', 4, 10]]);
  // Was «פלאנק 3*» with a single 30-second set.
  assert.deepStrictEqual(all('פלאנק 3*30 שניות').map((e) => [e.name, e.sets, e.duration_seconds]), [['פלאנק', 3, 30]]);
});

test('WhatsApp/markdown bold asterisks are not part of the name', () => {
  // Was «*סופרמן**», no clip.
  assert.deepStrictEqual(all('**סופרמן** 3x10').map((e) => [e.name, e.id, e.sets, e.reps]), [['סופרמן', 'superman', 3, 10]]);
  assert.deepStrictEqual(all('*סופרמן* 3*12').map((e) => [e.id, e.sets, e.reps]), [['superman', 3, 12]]);
  // A closing asterisk after the count is not a multiplier.
  assert.deepStrictEqual(all('*סופרמן 15*').map((e) => [e.id, e.sets, e.reps]), [['superman', 1, 15]]);
});
