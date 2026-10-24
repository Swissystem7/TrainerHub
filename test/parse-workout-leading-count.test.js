'use strict';

// Regression: «10 שכיבות סמיכה» (the count written before the name, as in a
// WhatsApp list) came out as an exercise named «10 שכיבות סמיכה» with 10
// invented reps - «20 סקוואטים» was 1×10 too.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון בוקר\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a count before the name is the reps', () => {
  const ex = main('10 שכיבות סמיכה\n20 סקוואטים\n15 בורפי');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.reps]; }),
    [['שכיבות סמיכה', 1, 10], ['סקוואטים', 1, 20], ['בורפי', 1, 15]]);
});

test('the session rounds and the line sets still apply', () => {
  const ex = main('3 סבבים:\n10 שכיבות סמיכה\n20 כפיפות בטן');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.reps]; }),
    [['שכיבות סמיכה', 3, 10], ['כפיפות בטן', 3, 20]]);
  const own = main('12 סקוואטים 4 סטים')[0];
  assert.deepEqual([own.name, own.sets, own.reps], ['סקוואטים', 4, 12]);
});

test('a count before the name does not override the line prescription', () => {
  const ex = main('סקוואט 3x12\nפלאנק 30 שניות');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.reps, e.duration_seconds]; }),
    [['סקוואט', 3, 12, null], ['פלאנק', 1, null, 30]]);
});
