'use strict';

// Regression: a distance line got 10 reps nobody wrote. «ריצה 400 מטר» came out
// as 1×10 with «400 מטר» in the notes, «ריצה 2 ק"מ» kept the distance in its name
// with 1×10, and «סקיפינג 3x50 מטר» became 3×50 reps of «סקיפינג מטר».

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון ריצה\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a distance is the prescription, not 10 reps', () => {
  const ex = main('ריצה 400 מטר\nריצה 2 ק"מ\nחתירה 1.5 קילומטר\nהליכה 500 מ\'');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ריצה', 'ריצה', 'חתירה', 'הליכה']);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['400 מטר', '2 ק"מ', '1.5 קילומטר', '500 מ\'']);
  ex.forEach(function (e) {
    assert.equal(e.reps, null);
    assert.equal(e.duration_seconds, null);
    assert.equal(e.sets, 1);
  });
});

test('«6x50 מטר» is 6 sets of 50 m, not 50 reps', () => {
  const ex = main('ספרינט 6x50 מטר\nסקיפינג 3x50 מ׳');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ספרינט', 'סקיפינג']);
  assert.deepEqual(ex.map(function (e) { return e.sets; }), [6, 3]);
  assert.deepEqual(ex.map(function (e) { return e.reps; }), [null, null]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['50 מטר', '50 מ׳']);
});

test('sets and rest around a distance still count', () => {
  const ex = main('הליכה 3 סטים של 200 מטר מנוחה 60 שניות');
  assert.equal(ex[0].name, 'הליכה');
  assert.equal(ex[0].sets, 3);
  assert.equal(ex[0].reps, null);
  assert.equal(ex[0].rest_seconds, 60);
  assert.equal(ex[0].notes, '200 מטר');
});

test('reps, seconds and «מכל צד» lines are unchanged', () => {
  const ex = main('סקוואט 3x12\nפלאנק 30 שניות\nריצה 5 דקות\nמכרז 10 מכל צד');
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds, e.notes]; }), [
    [3, 12, null, null],
    [1, null, 30, null],
    [1, null, 300, null],
    [1, 10, null, null]
  ]);
});
