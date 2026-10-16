'use strict';

// Regression: scanSessionDefaults read «N שניות עבודה» and «N סבבים» anywhere in
// the text, so one exercise line («בורפי 30 שניות עבודה», «ריצה 3 סבבים») made
// every bare exercise a 30 s timer or 3 sets, and «3 סבבים» stayed in its name.
// Only the title, a phase header or a non-exercise line speaks for the session.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  const phase = parseWorkoutClient(text).phases.find((p) => p.name === 'Main');
  return phase.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]);
}

test('one exercise\'s «30 שניות עבודה» does not time the others', () => {
  assert.deepEqual(main('אימון כוח\nבורפי 30 שניות עבודה\nסקוואט\nלחיצת חזה'), [
    ['בורפי', 1, null, 30],
    ['סקוואט', 1, 10, null],
    ['לחיצת חזה', 1, 10, null]
  ]);
});

test('one exercise\'s «3 סבבים» is its sets and leaves the name', () => {
  assert.deepEqual(main('אימון\nבורפי 30 שניות עבודה, 3 סבבים\nסקוואט 3x12\nפלאנק'), [
    ['בורפי', 3, null, 30],
    ['סקוואט', 3, 12, null],
    ['פלאנק', 1, 10, null]
  ]);
  assert.deepEqual(main('אימון\nריצה 3 סבבים של 400 מטר\nסקוואט')[1], ['סקוואט', 1, 10, null]);
});

test('title, interval line and «בצעו 3 סבבים» still set the session', () => {
  assert.deepEqual(main('אימון 40 שניות עבודה\nבורפי\nסקוואט'), [
    ['בורפי', 1, null, 40],
    ['סקוואט', 1, null, 40]
  ]);
  assert.deepEqual(main('אימון\n40 שניות עבודה\nבורפי'), [['בורפי', 1, null, 40]]);
  assert.deepEqual(main('אימון\n3 סבבים:\nבורפי'), [['בורפי', 3, 10, null]]);
  assert.deepEqual(main('אימון\nבצעו 3 סבבים\nבורפי 30 שניות\nסקוואט 12 חזרות'), [
    ['בורפי', 3, null, 30],
    ['סקוואט', 3, 12, null]
  ]);
});

test('a «עיקרי» header is the Main phase and its counts apply to the lines under it', () => {
  assert.deepEqual(main('אימון\nעיקרי - 4 סבבים, 40 שניות עבודה\nבורפי\nסקוואט 3x12'), [
    ['בורפי', 4, null, 40],
    ['סקוואט', 3, 12, null]
  ]);
  assert.deepEqual(main('אימון\nחלק עיקרי: בורפי 30 שניות עבודה, סקוואט'), [
    ['בורפי', 1, null, 30],
    ['סקוואט', 1, 10, null]
  ]);
});
