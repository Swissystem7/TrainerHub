'use strict';

// Regression: «ריצה (5 דקות)» came out as 10 reps of an exercise named
// «ריצה (5 דקות)», «סקוואט 3x10 (מנוחה דקה)» lost its rest, and
// «פלאנק (30 שניות)» was named «פלאנק ( )». A bracket next to an amount
// must not hide it, and the empty brackets it leaves are not part of the name.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון סוגריים\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('amounts in brackets are read, and the brackets leave the name', () => {
  const ex = main('ריצה (5 דקות)\nסקוואט 3x10 (מנוחה דקה)\nפלאנק (30 שניות)\nלחיצת חזה 3x8 (מנוחה 90 שניות)\nפלאנק צד (30 שניות לכל צד)');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ריצה', 'סקוואט', 'פלאנק', 'לחיצת חזה', 'פלאנק צד']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds, e.rest_seconds]; }),
    [[1, null, 300, null], [3, 10, null, 60], [1, null, 30, null], [3, 8, null, 90], [1, null, 30, null]]);
  assert.equal(ex[4].notes, 'לכל צד');
});

test('words in brackets stay in the name', () => {
  const ex = main('לחיצת כתפיים 3x12 (משקולות)');
  assert.equal(ex[0].name, 'לחיצת כתפיים (משקולות)');
  assert.deepEqual([ex[0].sets, ex[0].reps], [3, 12]);
});
