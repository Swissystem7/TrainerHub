'use strict';

// Regression: JS "\b" is ASCII-only, so /^מנוחה\b/ and /^חזור\b/ never matched
// a Hebrew word followed by a space or the end of the line. "מנוחה" and
// "חזור 3 פעמים" lines therefore became 10-rep exercises on the card and in
// workout-mode. Minutes ("ריצה 5 דקות") were also ignored and fell back to 10 reps.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function mainNames(text) {
  const w = parseWorkoutClient(text);
  const main = w.phases.find(function (p) { return p.name === 'Main'; });
  return main ? main.exercises : [];
}

test('"מנוחה" and "חזור N פעמים" lines are not turned into exercises', function () {
  const ex = mainNames(
    'אימון כוח, 40 דקות\nעיקר:\nסקוואט 3 סטים של 12\nמנוחה\nלחיצת חזה 3x10\nחזור 3 פעמים'
  );
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'לחיצת חזה']);
});

test('"מנוחה דקה" / "חזור פעמיים" are skipped and the minute becomes the rest default', function () {
  const ex = mainNames(
    'אימון, 30 דקות\nעיקר:\nסקוואט 3 סטים של 12\nמנוחה דקה\nלחיצת כתפיים 3 סטים של 10\nחזור פעמיים'
  );
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'לחיצת כתפיים']);
  assert.equal(ex[0].rest_seconds, 60);
});

test('"מנוחה של 2 דקות בין סטים" sets a 120s rest default', function () {
  const ex = mainNames('אימון, 30 דקות\nעיקר:\nסקוואט 10 חזרות\nמנוחה של 2 דקות בין סטים');
  assert.equal(ex.length, 1);
  assert.equal(ex[0].rest_seconds, 120);
});

test('minutes on an exercise line are timed work, not 10 reps', function () {
  const ex = mainNames('אימון, 30 דקות\nעיקר:\nריצה 5 דקות\nהליכה דקה\nסקוואט 10 חזרות');
  assert.deepEqual(
    ex.map(function (e) { return [e.name, e.reps, e.duration_seconds]; }),
    [['ריצה', null, 300], ['הליכה', null, 60], ['סקוואט', 10, null]]
  );
});

test('exercises that merely start with the same letters are kept', function () {
  const ex = mainNames('אימון, 30 דקות\nעיקר:\nחזרות על המדרגה 10 חזרות\nמנוחות 3 סטים של 8');
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['חזרות על המדרגה', 'מנוחות']);
});
