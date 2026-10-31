'use strict';

// Regression: the editor read «סקוואט 3x10-12» as 3 x 10 named «סקוואט 12» - the
// range's upper bound stayed in the exercise name. «3 סטים של 8-10» and
// «10-12 חזרות» did the same, and «פלאנק 3x30-45 שניות» came out as 30 reps
// plus 45 seconds.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a rep range is the lower bound, with the range as a note', () => {
  const ex = main([
    'סקוואט 3x10-12',
    'לחיצת חזה 4 x 8–10 חזרות',
    'חתירה 3 סטים של 8-10',
    'מתח 4 סטים 6-8',
    'שכיבות שמיכה 10-12 חזרות'
  ].join('\n'));
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'לחיצת חזה', 'חתירה', 'מתח', 'שכיבות שמיכה']);
  assert.deepEqual(ex.map(function (e) { return e.reps; }), [10, 8, 8, 6, 10]);
  assert.deepEqual(ex.slice(0, 4).map(function (e) { return e.sets; }), [3, 4, 3, 4]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['10-12 חזרות', '8-10 חזרות', '8-10 חזרות', '6-8 חזרות', '10-12 חזרות']);
});

test('the range sits beside per-side, load and rest notes', () => {
  const ex = main('לאנג׳ים 3x10-12 לכל רגל מנוחה 60 שניות\nדדליפט 3x6-8 100 קג');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['לאנג׳ים', 'דדליפט']);
  assert.deepEqual(ex.map(function (e) { return e.reps; }), [10, 6]);
  assert.equal(ex[0].rest_seconds, 60);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['לכל רגל, 10-12 חזרות', '100 ק״ג, 6-8 חזרות']);
});

test('a seconds range after NxM is timed work, not reps', () => {
  const ex = main('פלאנק 3x30-45 שניות\nפלאנק צד 3 סטים של 20-30 שניות');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['פלאנק', 'פלאנק צד']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }), [[3, null, 30], [3, null, 20]]);
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['30-45 שניות', '20-30 שניות']);
});

test('lines without a range are unchanged', () => {
  const ex = main('סקוואט 3x12\nפלאנק 3x30 שניות');
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds, e.notes]; }), [[3, 12, null, null], [3, null, 30, null]]);
});
