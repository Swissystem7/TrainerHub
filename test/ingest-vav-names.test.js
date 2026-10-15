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

test('a clip name with a «ו» join stays one exercise', () => {
  // Was «כתפיים» + «גב» (superman), both with the same 10 reps.
  assert.deepStrictEqual(all('כתפיים וגב 10'),
    [{ name: 'כתפיים וגב', id: 'כתפיים_וגב', sets: 1, reps: 10, duration_seconds: null, notes: null }]);
  // Was «שכיבות סמיכה» with an invented 10 reps + «רגליים» on the ladder clip.
  assert.deepStrictEqual(all('שכיבות סמיכה ורגליים 3x8'),
    [{ name: 'שכיבות סמיכה ורגליים', id: 'שכיבות_סמיכה_ורגליים', sets: 3, reps: 8, duration_seconds: null, notes: null }]);
  assert.deepStrictEqual(all('1. שכיבות שמיכה ובעיטות 12').map((e) => [e.id, e.reps]),
    [['שכיבות_שמיכה_ובעיטות', 12]]);
});

test('a «ו» between two exercises still splits them', () => {
  assert.deepStrictEqual(all('סקוואט 15 ושכיבות סמיכה 10').map((e) => [e.name, e.reps]),
    [['סקוואט', 15], ['שכיבות סמיכה', 10]]);
  assert.deepStrictEqual(all('פלאנק 30 שניות וכתפיים וגב 12').map((e) => [e.id, e.reps]),
    [['plank', null], ['כתפיים_וגב', 12]]);
});
