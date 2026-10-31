'use strict';

// Regression: «פלאנק 1:30» came out as an exercise named «פלאנק 1 30» with 10
// invented reps - the studio parser had no idea a trainer's «1:30» is a minute
// and a half, so «בורפי 3x0:40» was 3 × 0 reps named «בורפי 40» and the rest in
// «סקוואט 3x12 מנוחה 1:30» was 1 second.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון ליבה\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('minutes:seconds on an exercise line is its work time', () => {
  const ex = main([
    'פלאנק 1:30',
    'בורפי 3x0:40',
    'ריצה 10:00 דקות',
    'פלאנק צד 0:45 לכל צד'
  ].join('\n'));
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['פלאנק', 'בורפי', 'ריצה', 'פלאנק צד']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[1, null, 90], [3, null, 40], [1, null, 600], [1, null, 45]]);
});

test('minutes:seconds after «מנוחה» is the rest', () => {
  const ex = main('סקוואט 3x12 מנוחה 1:30');
  assert.equal(ex[0].name, 'סקוואט');
  assert.deepEqual([ex[0].sets, ex[0].reps, ex[0].rest_seconds], [3, 12, 90]);
});

test('the title keeps its clock time', () => {
  const w = parseWorkoutClient('אימון 18:00\nסקוואט 3x12');
  assert.equal(w.title.indexOf('שניות'), -1);
});
