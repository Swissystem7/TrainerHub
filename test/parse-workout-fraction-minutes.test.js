'use strict';

// Regression: Creator Studio's client parser read only whole minutes. «ריצה 1.5 דקות»
// became «ריצה 1» with 5 minutes of work, «פלאנק חצי דקה» a full minute named
// «פלאנק חצי», «ריצה דקה וחצי» a minute named «ריצה וחצי», and «מנוחה 1.5 דקות»
// a 1-second rest with 5 minutes of work. A singular «1 סט» stayed in the name.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  const w = parseWorkoutClient(text);
  const phase = w.phases.find(function (p) { return p.name === 'Main'; });
  return phase.exercises.map(function (e) {
    return [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds];
  });
}

test('decimal minutes are timed work and stay out of the name', function () {
  assert.deepEqual(main('אימון\nריצה 1.5 דקות\nפלאנק 2.5 דק\nהליכה 1,5 דקות'), [
    ['ריצה', 1, null, 90, null],
    ['פלאנק', 1, null, 150, null],
    ['הליכה', 1, null, 90, null]
  ]);
});

test('half a minute and a minute and a half', function () {
  assert.deepEqual(main('אימון\nפלאנק חצי דקה\nריצה דקה וחצי\nחבל 2 דקות וחצי'), [
    ['פלאנק', 1, null, 30, null],
    ['ריצה', 1, null, 90, null],
    ['חבל', 1, null, 150, null]
  ]);
});

test('a fractional rest is that rest, not the work time', function () {
  assert.deepEqual(main('אימון\nסקוואט 3x12 מנוחה 1.5 דקות\nלחיצה 3x10 מנוחה חצי דקה\nחתירה 3x10 מנוחה דקה וחצי'), [
    ['סקוואט', 3, 12, null, 90],
    ['לחיצה', 3, 10, null, 30],
    ['חתירה', 3, 10, null, 90]
  ]);
});

test('a singular «1 סט» is the set count', function () {
  assert.deepEqual(main('אימון\nסקוואט 1 סט של 12 חזרות\nלחיצה 4 סטים 10 חזרות'), [
    ['סקוואט', 1, 12, null, null],
    ['לחיצה', 4, 10, null, null]
  ]);
});

test('whole minutes, «דקה» and a session rest line are unchanged', function () {
  assert.deepEqual(main('אימון\nריצה 5 דקות\nהליכה דקה\nמנוחה 2 דקות בין תרגילים'), [
    ['ריצה', 1, null, 300, 120],
    ['הליכה', 1, null, 60, 120]
  ]);
});
