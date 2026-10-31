'use strict';

// Regression: the editor's line parser read minutes but not hours, so «ריצה רבע שעה»
// became 10 reps of an exercise named «ריצה רבע שעה», and «הליכה שעה» 10 reps of
// «הליכה שעה». An hour phrase on an exercise line is its work time.

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

test('an hour phrase on an exercise line is its work time', function () {
  assert.deepEqual(main('אימון\nריצה רבע שעה\nהליכה שעה\nאופניים שעה וחצי\nחתירה חצי שעה'), [
    ['ריצה', 1, null, 900, null],
    ['הליכה', 1, null, 3600, null],
    ['אופניים', 1, null, 5400, null],
    ['חתירה', 1, null, 1800, null]
  ]);
});

test('minutes on the line still win over the hour reading', function () {
  assert.deepEqual(main('אימון\nריצה 5 דקות'), [['ריצה', 1, null, 300, null]]);
});
