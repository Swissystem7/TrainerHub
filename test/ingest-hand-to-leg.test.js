'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.reps, /לכל רגל/.test(e.notes || '')]));
}

test('«אולר יד לרגל נגדית» keeps «לרגל» in the name, with no «לכל רגל» note', () => {
  // Was «אולר יד נגדית» noted «לכל רגל» - the ready-made workouts write it eight times.
  assert.deepStrictEqual(rows('30 אולר יד לרגל נגדית'), [['אולר יד לרגל נגדית', 30, false]]);
  assert.deepStrictEqual(rows('אולר יד לרגל 3x12'), [['אולר יד לרגל', 12, false]]);
  assert.deepStrictEqual(rows('מרפק לרגל השנייה 10'), [['מרפק לרגל השנייה', 10, false]]);
});

test('a bare «לרגל» after the count is still per leg', () => {
  assert.deepStrictEqual(rows('לאנג׳ 3x12 לרגל'), [['לאנג׳', 12, true]]);
  assert.deepStrictEqual(rows('לאנג׳ 12 לרגל'), [['לאנג׳', 12, true]]);
  assert.deepStrictEqual(rows('לאנג׳ 3x10 לכל רגל'), [['לאנג׳', 10, true]]);
});
