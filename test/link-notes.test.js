'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/index.html',
  pathname: '/TrainerHub/index.html',
  hash: ''
};

const TH = require('../js/core.js');

const w = {
  title: 't',
  phases: [{
    name: 'Main',
    exercises: [{
      name: 'פלאנק',
      id: 'plank',
      sets: 3,
      reps: null,
      duration_seconds: 40,
      rest_seconds: 30,
      notes: 'גב ישר, בלי לקרוס באגן'
    }]
  }]
};

test('compactPlan stores coach notes on the exercise row', function () {
  const compact = TH.compactPlan(w);
  assert.equal(compact.p[0].e[0].no, 'גב ישר, בלי לקרוס באגן');
});

test('expandPlan restores coach notes from compact rows', function () {
  const expanded = TH.expandPlan(TH.compactPlan(w));
  assert.equal(expanded.phases[0].exercises[0].notes, 'גב ישר, בלי לקרוס באגן');
});

test('encodeLink and decodeHash round-trip coach notes', function () {
  const url = TH.encodeLink(w, {});
  const decoded = TH.decodeHash(url.slice(url.indexOf('#')));
  assert.equal(decoded.workout.phases[0].exercises[0].notes, 'גב ישר, בלי לקרוס באגן');
});

test('notes are stored verbatim without truncation', function () {
  const longNote = 'א'.repeat(300);
  const workout = {
    title: 't',
    phases: [{
      name: 'Main',
      exercises: [{ name: 'פלאנק', id: 'plank', sets: 1, notes: longNote }]
    }]
  };
  const roundTrip = TH.expandPlan(TH.compactPlan(workout));
  assert.equal(roundTrip.phases[0].exercises[0].notes, longNote);
  const url = TH.encodeLink(workout, {});
  const decoded = TH.decodeHash(url.slice(url.indexOf('#')));
  assert.equal(decoded.workout.phases[0].exercises[0].notes, longNote);
});

test('empty or null notes omit the compact no key', function () {
  const base = {
    name: 'פלאנק',
    id: 'plank',
    sets: 3,
    reps: null,
    duration_seconds: 40,
    rest_seconds: 30
  };
  const expectedRow = { n: 'פלאנק', id: 'plank', s: 3, ds: 40, rs: 30 };

  for (const notes of [null, '']) {
    const workout = {
      title: 't',
      phases: [{ name: 'Main', exercises: [{ ...base, notes }] }]
    };
    const row = TH.compactPlan(workout).p[0].e[0];
    assert.deepEqual(row, expectedRow);
    assert.equal(TH.expandPlan(TH.compactPlan(workout)).phases[0].exercises[0].notes, null);
  }
});
