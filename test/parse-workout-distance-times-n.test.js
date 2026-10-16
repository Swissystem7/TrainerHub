'use strict';

// Regression: «ספרינט 50 מטר x 6» came out as one set of «ספרינט x 6» - the
// distance was read but the «x 6» after it was not, so the 6 sets were lost and
// the count stayed in the name. «6x50 מטר» (count first) already worked.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון ריצה\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('«50 מטר x 6» is 6 sets of 50 m', () => {
  const ex = main('ספרינט 50 מטר x 6\nהליכת חקלאי 20 מטר x3\nריצה 400 מטר X 4 מנוחה 90 שניות\nספרינט 30 מ׳ ×5 חזרות');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ספרינט', 'הליכת חקלאי', 'ריצה', 'ספרינט']);
  assert.deepEqual(ex.map(function (e) { return e.sets; }), [6, 3, 4, 5]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['50 מטר', '20 מטר', '400 מטר', '30 מ׳']);
  ex.forEach(function (e) {
    assert.equal(e.reps, null);
    assert.equal(e.duration_seconds, null);
  });
  assert.equal(ex[2].rest_seconds, 90);
});

test('count-first distances are unchanged', () => {
  const ex = main('ספרינט 6x50 מטר\nריצה 400 מטר');
  assert.deepEqual(ex.map(function (e) { return e.sets; }), [6, 1]);
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['ספרינט', 'ריצה']);
});
