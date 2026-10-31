'use strict';

// A plank sent as a single-clip link, or added from the library with
// «הוסף לאימון», got the generic «3 × 8-12 חזרות», so workout-mode showed
// «פלאנק · 8-12 חזרות» and waited for reps instead of counting the hold down.
// Static holds now get hold seconds, like in the program builder; moving
// clips (including «מטפס הרים עם פלאנק») keep the rep range.

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const catalog = require('../js/catalog.json');

function mainOf(workout) {
  return workout.phases.filter(function (p) { return p.name === 'Main'; })[0] || workout.phases[1];
}

function memStore() {
  const data = {};
  global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; }
  };
}

test('a plank clip link opens as a timed hold, not reps', function () {
  TH.setCatalog(catalog);
  ['plank', 'פלאנק_צידי'].forEach(function (id) {
    const ex = mainOf(TH.clipToWorkout({ id: id })).exercises[0];
    assert.equal(ex.reps, null, id);
    assert.equal(ex.duration_seconds, 40, id);
    assert.equal(ex.sets, 3, id);
  });
});

test('a plank clip link still holds when the catalog has not loaded yet', function () {
  TH.setCatalog({});
  const ex = mainOf(TH.clipToWorkout({ id: 'plank', he: 'פלאנק' })).exercises[0];
  assert.equal(ex.name, 'פלאנק');
  assert.equal(ex.reps, null);
  assert.equal(ex.duration_seconds, 40);
});

test('a moving clip link keeps the rep range', function () {
  TH.setCatalog(catalog);
  ['מטפס_הרים_עם_פלאנק', 'crunches'].forEach(function (id) {
    const ex = mainOf(TH.clipToWorkout({ id: id })).exercises[0];
    assert.equal(ex.reps, '8-12', id);
    assert.equal(ex.duration_seconds, null, id);
  });
});

test('«הוסף לאימון» on a plank adds a hold; a moving clip keeps reps', function () {
  memStore();
  TH.setCatalog(catalog);
  TH.draftClear();
  TH.draftAdd('plank');
  const w = TH.draftAdd('crunches');
  const exs = mainOf(w).exercises;
  const plank = exs.filter(function (x) { return x.id === 'plank'; })[0];
  const crunch = exs.filter(function (x) { return x.id === 'crunches'; })[0];
  assert.equal(plank.reps, null);
  assert.equal(plank.duration_seconds, 40);
  assert.equal(crunch.reps, '8-12');
  assert.equal(crunch.duration_seconds, null);
  TH.draftClear();
  delete global.localStorage;
});
