'use strict';

// Regression: «אימון 1 שעה» was titled «אימון 1» - the title cleaner knew
// «2 שעות», «שעה» and «שעתיים» but not a number before the singular «שעה», so
// only the word was cut and the «1» stayed in the workout name.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

test('«אימון 1 שעה» is titled «אימון»', () => {
  const w = parseWorkoutClient('אימון 1 שעה\nסקוואט 3x10');
  assert.equal(w.title, 'אימון');
  assert.equal(w.duration_minutes, 60);
});

test('«אימון כוח 1 שעה וחצי» is titled «אימון כוח» and lasts 90 minutes', () => {
  const w = parseWorkoutClient('אימון כוח 1 שעה וחצי\nסקוואט 3x10');
  assert.equal(w.title, 'אימון כוח');
  assert.equal(w.duration_minutes, 90);
});

test('«2 שעות» and a bare «שעה» are still cut from the title', () => {
  assert.equal(parseWorkoutClient('אימון רגליים 2 שעות\nסקוואט 3x10').title, 'אימון רגליים');
  assert.equal(parseWorkoutClient('אימון גב שעה\nחתירה 3x10').title, 'אימון גב');
});
