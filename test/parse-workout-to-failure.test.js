'use strict';

// Regression: «מתח מקסימום» / «שכיבות סמיכה עד כשל» came out as 10 invented reps of an
// exercise named «מתח מקסימום», and «מתח 3xמקס» kept «3xמקס» in its name with one set -
// the studio parser never read «מקסימום» / «עד כשל» (js/ingest.js already does).

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

function brief(e) {
  return { name: e.name, sets: e.sets, reps: e.reps, seconds: e.duration_seconds, notes: e.notes };
}

test('«מקסימום» / «עד כשל» is to failure, not 10 reps', () => {
  const ex = main('מתח מקסימום\nשכיבות סמיכה עד כשל\nפלאנק מקסימום זמן');
  assert.deepEqual(ex.map(brief), [
    { name: 'מתח', sets: 1, reps: null, seconds: null, notes: 'עד כשל' },
    { name: 'שכיבות סמיכה', sets: 1, reps: null, seconds: null, notes: 'עד כשל' },
    { name: 'פלאנק', sets: 1, reps: null, seconds: null, notes: 'עד כשל' }
  ]);
});

test('the sets stay: «3 סטים מקסימום», «3xמקס», «4 פעמים מקסימום»', () => {
  const ex = main('שכיבות סמיכה 3 סטים מקסימום\nמתח 3xמקס\nדיפס 3x מקסימום חזרות\nמתח 4 פעמים מקסימום');
  assert.deepEqual(ex.map(brief), [
    { name: 'שכיבות סמיכה', sets: 3, reps: null, seconds: null, notes: 'עד כשל' },
    { name: 'מתח', sets: 3, reps: null, seconds: null, notes: 'עד כשל' },
    { name: 'דיפס', sets: 3, reps: null, seconds: null, notes: 'עד כשל' },
    { name: 'מתח', sets: 4, reps: null, seconds: null, notes: 'עד כשל' }
  ]);
});

test('in a «40 שניות עבודה» session the work time still applies', () => {
  const ex = parseWorkoutClient('אימון 40 שניות עבודה\nבורפי מקסימום')
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
  assert.deepEqual(ex.map(brief), [
    { name: 'בורפי', sets: 1, reps: null, seconds: 40, notes: 'עד כשל' }
  ]);
});

test('a name that only starts like «מקס» is untouched', () => {
  const ex = main('מקסי פד 10 חזרות');
  assert.deepEqual(ex.map(brief), [
    { name: 'מקסי פד', sets: 1, reps: 10, seconds: null, notes: null }
  ]);
});

test('a load still becomes a note next to «עד כשל»', () => {
  const ex = main('לחיצת חזה 3 סטים 60 קג עד כשל');
  assert.deepEqual(ex.map(brief), [
    { name: 'לחיצת חזה', sets: 3, reps: null, seconds: null, notes: 'עד כשל, 60 ק״ג' }
  ]);
});
