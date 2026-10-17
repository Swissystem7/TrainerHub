'use strict';

// Regression: «לאנג׳ 3x10 לכל רגל» was an exercise named «לאנג׳ לכל רגל», and
// «לאנג׳ 3x10/10» was named «לאנג׳ /10» - the per-side part stayed in the name.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון רגליים\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

function brief(e) {
  return { name: e.name, sets: e.sets, reps: e.reps, seconds: e.duration_seconds, notes: e.notes };
}

test('«לכל רגל» / «כל יד» / «לרגל» is a note, not part of the name', () => {
  const ex = main('לאנג׳ 3x10 לכל רגל\nחתירה בכבל 3x12 כל יד\nסקוואט בולגרי 3x8 לרגל\nפלאנק צד 3x30 שניות לכל צד');
  assert.deepEqual(ex.map(brief), [
    { name: 'לאנג׳', sets: 3, reps: 10, seconds: null, notes: 'לכל רגל' },
    { name: 'חתירה בכבל', sets: 3, reps: 12, seconds: null, notes: 'לכל יד' },
    { name: 'סקוואט בולגרי', sets: 3, reps: 8, seconds: null, notes: 'לכל רגל' },
    { name: 'פלאנק צד', sets: 3, reps: null, seconds: 30, notes: 'לכל צד' }
  ]);
});

test('«3x10/10» / «10/10 חזרות» is 10 reps per side', () => {
  const ex = main('לאנג׳ 3x10/10\nצעדי לאנג׳ 10/10 חזרות');
  assert.deepEqual(ex.map(brief), [
    { name: 'לאנג׳', sets: 3, reps: 10, seconds: null, notes: 'לכל צד' },
    { name: 'צעדי לאנג׳', sets: 1, reps: 10, seconds: null, notes: 'לכל צד' }
  ]);
});

test('a name with «רגל» and no per-side phrase is untouched', () => {
  const ex = main('הרמת רגל 3x10\nפלאנק צד 3x30 שניות');
  assert.deepEqual(ex.map(brief), [
    { name: 'הרמת רגל', sets: 3, reps: 10, seconds: null, notes: null },
    { name: 'פלאנק צד', sets: 3, reps: null, seconds: 30, notes: null }
  ]);
});
