'use strict';

// Regression: Creator Studio's client parser read «אימון 3 סבבים של 5 דקות» as a
// 5-minute session titled «אימון 3 סבבים של» - the minutes are per round.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

test('minutes per round in the title multiply by the rounds', () => {
  const w = parseWorkoutClient('אימון 3 סבבים של 5 דקות\nסקוואט 10\nשכיבות סמיכה 10');
  assert.equal(w.duration_minutes, 15);
  assert.equal(w.title, 'אימון 3 סבבים');
  assert.equal(parseWorkoutClient('אימון 4 סבבים x 3 דקות\nברפי 10').duration_minutes, 12);
  assert.equal(parseWorkoutClient('אימון 5 סבבים של דקה\nברפי 10').duration_minutes, 5);
});

test('a session length beside the rounds wins', () => {
  const w = parseWorkoutClient('אימון 4 סבבים של 3 דקות, 40 דקות\nסקוואט 10');
  assert.equal(w.duration_minutes, 40);
  assert.equal(w.title, 'אימון 4 סבבים');
  assert.equal(parseWorkoutClient('אימון 3 סבבים של 5 דקות, שעה\nסקוואט 10').duration_minutes, 60);
});

test('a phase header with rounds gets the whole phase', () => {
  const w = parseWorkoutClient('אימון\nעיקרי 3 סבבים של 5 דקות\nסקוואט 10');
  assert.equal(w.phases.find((p) => p.name === 'Main').duration_minutes, 15);
});

test('plain lengths are unchanged', () => {
  assert.equal(parseWorkoutClient('אימון 45 דקות\nסקוואט 10').duration_minutes, 45);
  assert.equal(parseWorkoutClient('אימון של 5 דקות\nברפי 10').duration_minutes, 5);
  assert.equal(parseWorkoutClient('אימון של 5 דקות\nברפי 10').title, 'אימון');
});
