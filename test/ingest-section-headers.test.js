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
  // Every phase: a «חימום:» / «שחרור:» header puts the exercises under it in its own phase.
  return [].concat.apply([], Ingest.ingestText(text, TH.catalog).workout.phases.map(function (ph) { return ph.exercises; })).map(function (ex) {
    return { name: ex.name, id: ex.id, sets: ex.sets, reps: ex.reps, duration_seconds: ex.duration_seconds, notes: ex.notes };
  });
}
function ids(text) { return all(text).map((e) => [e.name, e.id, e.sets, e.reps, e.duration_seconds]); }

test('a header line with a colon in the middle of a paste is not an exercise', () => {
  // Was «עיקרי» with 10 invented reps and no clip, wishlisted.
  assert.deepStrictEqual(ids('חימום:\nסופרמן 10\nעיקרי:\nפלאנק 30 שניות\n**שחרור:**\nסופרמן 3x10'), [
    ['סופרמן', 'superman', 1, 10, null],
    ['פלאנק', 'plank', 1, null, 30],
    ['סופרמן', 'superman', 3, 10, null]
  ]);
  assert.deepStrictEqual(ids('סופרמן 10\nתרגילי בטן:\nפלאנק 30 שניות').map((e) => e[1]), ['superman', 'plank']);
});

test('a bare section word or a numbered round is a header', () => {
  // Was «קירור» / «סיום» / «חלק ב׳» with 10 reps, «סבב» with 1 and 2 reps.
  assert.deepStrictEqual(ids('סבב 1\nסופרמן 10\nסבב 2\nפלאנק 30 שניות').map((e) => e[1]), ['superman', 'plank']);
  assert.deepStrictEqual(ids('חלק ב׳\nסופרמן 10\nקירור\nפלאנק 30 שניות\nסיום').map((e) => e[1]), ['superman', 'plank']);
  assert.deepStrictEqual(ids('*עיקרי*\nסופרמן 10').map((e) => e[1]), ['superman']);
});

test('a header label before an exercise is dropped, the exercise kept', () => {
  // Was «עיקרי סופרמן» with no clip, and «חימום קפיצות» on the warm-up clip.
  assert.deepStrictEqual(ids('סופרמן 10\nעיקרי: סופרמן 3x10'), [
    ['סופרמן', 'superman', 1, 10, null],
    ['סופרמן', 'superman', 3, 10, null]
  ]);
  assert.deepStrictEqual(ids('סופרמן 10\nחימום: פלאנק 30 שניות').filter((e) => e[1] === 'plank'), [['פלאנק', 'plank', 1, null, 30]]);
});

test('an exercise name with a colon and a bare clip name stay exercises', () => {
  assert.deepStrictEqual(ids('סופרמן 10\nפלאנק: 30 שניות')[1], ['פלאנק', 'plank', 1, null, 30]);
  assert.deepStrictEqual(ids('חימום\nסופרמן 10').map((e) => e[1]), ['warmup', 'superman']);
});
