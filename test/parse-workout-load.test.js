'use strict';

// Regression: «לחיצת חזה 4x8 80 קג» came out named «לחיצת חזה 80 קג» - the
// studio parser never read a load, so the weight stayed in the exercise name
// (and «סקוואט 5x5 עם 100 ק"ג» was named «סקוואט עם 100 ק"ג»).

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a load is a note, not part of the name', () => {
  const ex = main([
    'לחיצת חזה 4x8 80 קג',
    'סקוואט 5x5 עם 100 ק"ג',
    'דדליפט 3x5 120kg',
    'חתירה 3x10 עם משקולת 12 קילו',
    'לחיצת כתפיים 3x10 20 ק״ג מנוחה 60 שניות'
  ].join('\n'));
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['לחיצת חזה', 'סקוואט', 'דדליפט', 'חתירה עם משקולת', 'לחיצת כתפיים']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps]; }), [[4, 8], [5, 5], [3, 5], [3, 10], [3, 10]]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['80 ק״ג', '100 ק״ג', '120 ק״ג', '12 ק״ג', '20 ק״ג']);
  assert.equal(ex[4].rest_seconds, 60);
});

test('kilometres are still a distance, and a load joins it', () => {
  const ex = main('ריצה 2 קילומטר\nהליכת חקלאי 20 מטר x3 24 קג');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ריצה', 'הליכת חקלאי']);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['2 קילומטר', '20 מטר, 24 ק״ג']);
  assert.equal(ex[1].sets, 3);
});
