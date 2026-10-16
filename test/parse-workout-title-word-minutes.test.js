'use strict';

// Regression: Creator Studio's client parser kept «x דקה» in the title of
// «אימון 5 סבבים x דקה» - cleanTitle only stripped digit minutes.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

test('word minutes per round leave the title', () => {
  assert.equal(parseWorkoutClient('אימון 5 סבבים x דקה\nברפי 10').title, 'אימון 5 סבבים');
  assert.equal(parseWorkoutClient('אימון 4 סבבים של דקה וחצי\nברפי 10').title, 'אימון 4 סבבים');
  assert.equal(parseWorkoutClient('אימון 6 סבבים של חצי דקה\nברפי 10').title, 'אימון 6 סבבים');
  assert.equal(parseWorkoutClient('אימון 5 סבבים של דקה, 40 דקות\nברפי 10').title, 'אימון 5 סבבים');
});

test('word minutes alone leave the title and the duration stays', () => {
  const w = parseWorkoutClient('פלאנק דקה\nפלאנק 3x30');
  assert.equal(w.title, 'פלאנק');
  assert.equal(parseWorkoutClient('אימון 5 סבבים x דקה\nברפי 10').duration_minutes, 5);
});

test('words that merely contain דקה are kept', () => {
  assert.equal(parseWorkoutClient('אימון בדקה התשעים\nברפי 10').title, 'אימון בדקה התשעים');
});
