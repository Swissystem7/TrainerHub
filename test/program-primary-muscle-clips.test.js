'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');

TH.setCatalog(require('../js/catalog.json'));

function program(equipment, muscle) {
  return TH.generateWorkoutProgram({
    age: 31, fitnessLevel: 'beginner', goals: ['strength'],
    availableEquipment: [equipment], targetMuscles: muscle ? [muscle] : [],
    previousWorkouts: 8, preferCatalog: true
  }, 1, 3);
}

function mainIds(day) {
  return day.exercises.map(function (x) { return x.name; });
}

const FULL_BODY_BAND = ['גומיות_התנגדות', 'עבודה_עם_גומייה', 'גומיות_במקום_מכון', 'בישיבה_אחד_נגד_השני'];

test('a band «רגליים» program fills every day with leg band clips, not full-body ones', function () {
  program('band', 'legs').dailyWorkouts.forEach(function (day) {
    const ids = mainIds(day);
    assert.equal(ids.length, 4);
    ids.forEach(function (id) {
      assert.ok(FULL_BODY_BAND.indexOf(id) === -1, 'day ' + day.day + ' got full-body clip ' + id);
    });
  });
});

test('a band «ליבה» program has «גומיות בטן» on every day', function () {
  program('band', 'core').dailyWorkouts.forEach(function (day) {
    assert.ok(mainIds(day).indexOf('גומיות_בטן') !== -1, 'day ' + day.day + ': ' + mainIds(day).join(', '));
  });
});

test('the legs day of a band full-body split uses leg band clips', function () {
  const legsDay = program('band', '').dailyWorkouts.find(function (d) { return d.split === 'legs'; });
  mainIds(legsDay).forEach(function (id) {
    assert.ok(FULL_BODY_BAND.indexOf(id) === -1, 'legs day got full-body clip ' + id);
  });
});

test('a bodyweight «ליבה» program skips the chest-first «מעגל מעגל» while core clips remain', function () {
  program('none', 'core').dailyWorkouts.forEach(function (day) {
    assert.equal(day.exercises.length, 4);
    assert.ok(mainIds(day).indexOf('מעגל_מעגל') === -1, 'day ' + day.day + ': ' + mainIds(day).join(', '));
  });
});

test('full-body clips still fill a day when the muscle has too few dedicated clips', function () {
  const pullDay = program('none', '').dailyWorkouts.find(function (d) { return d.split === 'pull'; });
  assert.equal(pullDay.exercises.length, 4);
});
