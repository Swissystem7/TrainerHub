'use strict';

// Regression: a «חימום:» header with its drills on the following lines, then «עיקרי:»,
// moved the drills into Main and left the warm-up as a filler «חימום כללי», and the title's
// «3 סבבים» made «מתיחות 5 דקות» under «שחרור:» three sets.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function phases(text) {
  return parseWorkoutClient(text).phases.map(function (p) {
    return [p.name, p.exercises.map(function (e) {
      return { name: e.name, sets: e.sets, reps: e.reps, seconds: e.duration_seconds };
    })];
  });
}

test('the lines under «חימום:» before «עיקרי:» are the warm-up, one set each', () => {
  const out = phases('אימון כוח 3 סבבים\nחימום:\nריצה קלה 5 דקות\nסיבובי ידיים 30 שניות\nעיקרי:\nסקוואט 3x10\nשחרור:\nמתיחות 5 דקות');
  assert.deepEqual(out, [
    ['Warm-up', [
      { name: 'ריצה קלה', sets: 1, reps: null, seconds: 300 },
      { name: 'סיבובי ידיים', sets: 1, reps: null, seconds: 30 }
    ]],
    ['Main', [{ name: 'סקוואט', sets: 3, reps: 10, seconds: null }]],
    ['Cool-down', [{ name: 'מתיחות', sets: 1, reps: null, seconds: 300 }]]
  ]);
});

test('without a later main header, the lines after «חימום» are still Main', () => {
  const out = phases('אימון כוח\nחימום 5 דקות\nסקוואט 3x10\nמתח 3x6');
  assert.deepEqual(out[0][1].map(function (e) { return e.name; }), ['חימום כללי']);
  assert.deepEqual(out[1][1].map(function (e) { return e.name; }), ['סקוואט', 'מתח']);
});
