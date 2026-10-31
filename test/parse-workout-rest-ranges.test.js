'use strict';

// Regression: the editor parser (frontend/parse-workout.js) did not know
// «דקתיים» or a range. «סקוואט 3x10 מנוחה דקתיים» kept «מנוחה דקתיים» in the
// name with no rest; «מנוחה 2-3 דקות» was a 2-second rest plus 180 s of work
// on a 3x10 exercise; «מנוחה 30-45 שניות» left «45 שניות» in the name.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('«מנוחה דקתיים» is a 2-minute rest, not part of the name', () => {
  const ex = main('סקוואט 3x10 מנוחה דקתיים\nדדליפט 3x5 דקתיים מנוחה\nמתח 3x5 מנוחה דקתיים וחצי');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'דדליפט', 'מתח']);
  assert.deepEqual(ex.map(function (e) { return e.rest_seconds; }), [120, 120, 150]);
  ex.forEach(function (e) { assert.equal(e.duration_seconds, null); });
});

test('a rest line «מנוחה דקתיים בין הסטים» rests the exercise above', () => {
  const ex = main('סקוואט 3x10\nמנוחה דקתיים בין הסטים');
  assert.equal(ex.length, 1);
  assert.equal(ex[0].name, 'סקוואט');
  assert.equal(ex[0].rest_seconds, 120);
});

test('«מנוחה 2-3 דקות» is a 2-minute rest, not 2 s of rest and 180 s of work', () => {
  const ex = main('לחיצת כתפיים 3x10 מנוחה 2-3 דקות');
  assert.equal(ex[0].name, 'לחיצת כתפיים');
  assert.equal(ex[0].reps, 10);
  assert.equal(ex[0].duration_seconds, null);
  assert.equal(ex[0].rest_seconds, 120);
});

test('a seconds range rests the lower bound and leaves the name clean', () => {
  const ex = main('פלאנק 3x30 שניות מנוחה 30-45 שניות\nסקוואט 3x12 30-45 שניות מנוחה');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['פלאנק', 'סקוואט']);
  assert.deepEqual(ex.map(function (e) { return e.rest_seconds; }), [30, 30]);
  assert.equal(ex[0].duration_seconds, 30);
});

test('a work range «ריצה 20-30 דקות» is 20 minutes of work', () => {
  const ex = main('ריצה 20-30 דקות');
  assert.equal(ex[0].name, 'ריצה');
  assert.equal(ex[0].duration_seconds, 1200);
});
