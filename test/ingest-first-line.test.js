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
function ids(text) { return all(text).map((e) => [e.name, e.id, e.sets, e.reps, e.duration_seconds]); }

test('a name with its prescription after a colon keeps the exercise', () => {
  // Was dropped: the first-line colon read «פלאנק» as the workout title.
  assert.deepStrictEqual(ids('פלאנק: 30 שניות\nסופרמן 3x10'), [
    ['פלאנק', 'plank', 1, null, 30],
    ['סופרמן', 'superman', 3, 10, null]
  ]);
  assert.deepStrictEqual(ids('*פלאנק:*\n3x30 שניות'), [['פלאנק', 'plank', 3, null, 30]]);
});

test('a «name:» line takes the prescription on the next line', () => {
  // Was an empty workout: «סופרמן:» was a header and «3x10» had no name.
  assert.deepStrictEqual(ids('סופרמן:\n3x10\nפלאנק:\n30 שניות'), [
    ['סופרמן', 'superman', 3, 10, null],
    ['פלאנק', 'plank', 1, null, 30]
  ]);
  // A real header still is one; a rest line does not inherit the name.
  assert.deepStrictEqual(ids('תרגילי בטן:\n3 סבבים\nפלאנק 30 שניות'), [['פלאנק', 'plank', 3, null, 30]]);
  assert.deepStrictEqual(ids('פלאנק:\nמנוחה 30 שניות\nסופרמן 10'), [['סופרמן', 'superman', 1, 10, null]]);
});

test('a digit-free title line is not an exercise unless it is a clip', () => {
  // Was «אימון כוח» with 10 invented reps, no clip, wishlisted.
  assert.deepStrictEqual(ids('אימון כוח\nפלאנק 30 שניות\nסופרמן 3x10'), [
    ['פלאנק', 'plank', 1, null, 30],
    ['סופרמן', 'superman', 3, 10, null]
  ]);
  assert.deepStrictEqual(ids('אימון קונוסים\nסופרמן 10').map((e) => e[1]), ['אימון_קונוסים_תגובה_וכוח', 'superman']);
  assert.deepStrictEqual(ids('חימום\nסופרמן 10').map((e) => e[1]), ['warmup', 'superman']);
  assert.deepStrictEqual(ids('אימון רגליים: סופרמן 15, פלאנק 30 שניות'), [
    ['סופרמן', 'superman', 1, 15, null],
    ['פלאנק', 'plank', 1, null, 30]
  ]);
});
