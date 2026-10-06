'use strict';

// A pasted workout states the rest once ("מנוחה 3 דקות" on the last line, or
// nothing at all on the first lines), so most exercises carry rest_seconds null.
// The analyzer averaged the rest over every exercise, counting the unstated
// ones as zero: a 3x5 heavy session with one stated 3-minute rest came out as
// hypertrophy. The average now runs over the exercises that state a rest, and
// an explicit zero rest (a circuit) is honoured instead of becoming 45 seconds.

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');
const Ingest = require('../js/ingest.js');

function mainOnly(exercises, extra) {
  return Object.assign({
    title: 'אימון',
    phases: [
      { name: 'Warm-up', duration_minutes: 0, exercises: [] },
      { name: 'Main', duration_minutes: null, exercises: exercises },
      { name: 'Cool-down', duration_minutes: 0, exercises: [] }
    ]
  }, extra || {});
}

test('unstated rests do not dilute the average: one stated 3-minute rest keeps 3x5 as strength', function () {
  const w = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: null },
    { name: 'דדליפט', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: null },
    { name: 'לחיצת חזה', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: null },
    { name: 'מתח', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: 180 }
  ]);
  assert.equal(Analyzer.analyzeSession(w).stimulus.key, 'strength');
});

test('a pasted 3x5 workout with the rest written once at the end is a strength stimulus', function () {
  const out = Ingest.ingestText('סקוואט 3x5\nדדליפט 3x5\nלחיצת חזה 3x5\nמתח 3x5\nמנוחה 3 דקות');
  const rests = out.workout.phases[1].exercises.map(function (e) { return e.rest_seconds; });
  assert.ok(rests.some(function (r) { return r == null; }), 'the fixture must leave some rests unstated');
  assert.ok(rests.some(function (r) { return r === 180; }), 'the fixture must state one 3-minute rest');
  assert.equal(Analyzer.analyzeSession(out.workout).stimulus.key, 'strength');
});

test('stated short rests still read as endurance, not strength', function () {
  const w = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: 30 },
    { name: 'דדליפט', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: null },
    { name: 'מתח', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: 30 }
  ]);
  assert.notEqual(Analyzer.analyzeSession(w).stimulus.key, 'strength');
});

test('no stated rest anywhere is still not a strength stimulus', function () {
  const w = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: null },
    { name: 'מתח', id: null, sets: 3, reps: 5, duration_seconds: null, rest_seconds: null }
  ]);
  assert.notEqual(Analyzer.analyzeSession(w).stimulus.key, 'strength');
});

test('restSeconds (camelCase, from the builder) counts as a stated rest too', function () {
  const w = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 5, restSeconds: 120 },
    { name: 'דדליפט', id: null, sets: 3, reps: 5 },
    { name: 'מתח', id: null, sets: 3, reps: 5 }
  ]);
  assert.equal(Analyzer.analyzeSession(w).stimulus.key, 'strength');
});

test('an explicit zero rest is zero in the duration estimate, not the 45-second default', function () {
  const circuit = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: 0 },
    { name: 'מתח', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: 0 }
  ]);
  const rested = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: null },
    { name: 'מתח', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: null }
  ]);
  // 2 exercises x 3 sets x 30s of work = 180s = 3 min; with the default rest
  // it is 180 + 2 x 2 x 45 = 360s = 6 min.
  assert.equal(Analyzer.analyzeSession(circuit).durationMinutes, 3);
  assert.equal(Analyzer.analyzeSession(rested).durationMinutes, 6);
});

test('a stated duration_minutes on the workout still wins over the estimate', function () {
  const w = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: 0 }
  ], { duration_minutes: 25 });
  assert.equal(Analyzer.analyzeSession(w).durationMinutes, 25);
});

test('a non-numeric rest is treated as unstated', function () {
  const w = mainOnly([
    { name: 'סקוואט', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: 'x' },
    { name: 'מתח', id: null, sets: 3, reps: 10, duration_seconds: null, rest_seconds: '' }
  ]);
  assert.equal(Analyzer.analyzeSession(w).durationMinutes, 6);
});
