'use strict';

// Regression: «ריצה של 20 דקות» came out named «ריצה של» - the studio parser
// took the 20 minutes out of the line but left the «של» that led into it
// (same for «פלאנק במשך 45 שניות», «ריצה למשך 10 דקות», «ריצה של 400 מטר").

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון בוקר\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('«של» / «במשך» / «למשך» before the prescription is not part of the name', () => {
  const ex = main([
    'ריצה של 20 דקות',
    'פלאנק במשך 45 שניות',
    'ריצה למשך 10 דקות',
    'ריצה של 400 מטר',
    'שכיבות סמיכה של 3x10',
    'קפיצות בחבל של דקה וחצי',
    'סיבובי ידיים של 20 פעמים'
  ].join('\n'));
  assert.deepEqual(ex.map(function (e) { return e.name; }),
    ['ריצה', 'פלאנק', 'ריצה', 'ריצה', 'שכיבות סמיכה', 'קפיצות בחבל', 'סיבובי ידיים']);
  assert.deepEqual(ex.map(function (e) { return e.duration_seconds; }), [1200, 45, 600, null, null, 90, null]);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps]; }),
    [[1, null], [1, null], [1, null], [1, null], [3, 10], [1, null], [1, 20]]);
  assert.equal(ex[3].notes, '400 מטר');
});

test('«של» inside a name stays', () => {
  const ex = main('תרגיל של הבית 20 שניות');
  assert.equal(ex[0].name, 'תרגיל של הבית');
  assert.equal(ex[0].duration_seconds, 20);
});
