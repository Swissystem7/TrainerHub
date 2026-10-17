'use strict';

// Regression: «פלאנק 30"» came out as «פלאנק 30"» with 10 invented reps - the
// studio parser only read «שניות» / «שנ׳» / «″», never the «"» / «״» / «''»
// trainers actually type, so «בורפי 3x40"» was 40 reps named «בורפי "» and a
// «20" עבודה 10" מנוחה» session line became an exercise.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון טבטה\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a double prime after a number is seconds', () => {
  const ex = main([
    'פלאנק 30"',
    'בורפי 3x40"',
    'כפיפות בטן 20״',
    "קפיצות 45''",
    'סקוואט 3x12 מנוחה 45"'
  ].join('\n'));
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['פלאנק', 'בורפי', 'כפיפות בטן', 'קפיצות', 'סקוואט']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[1, null, 30], [3, null, 40], [1, null, 20], [1, null, 45], [3, 12, null]]);
  assert.equal(ex[4].rest_seconds, 45);
});

test('a «20" עבודה 10" מנוחה» line sets the whole session', () => {
  const ex = main('20" עבודה 10" מנוחה\nבורפי\nסקוואט');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.duration_seconds, e.rest_seconds]; }),
    [['בורפי', 20, 10], ['סקוואט', 20, 10]]);
});

test('quotes that are not seconds stay as they were', () => {
  const w = parseWorkoutClient('אימון\nריצה 2 ק"מ\nלחיצה 3x8 20 ק"ג\nסקוואט 3x12 "איטי"');
  const ex = w.phases.find(function (p) { return p.name === 'Main'; }).exercises;
  assert.deepEqual(ex.map(function (e) { return e.notes; }), ['2 ק"מ', '20 ק״ג', null]);
  assert.equal(ex[2].name, 'סקוואט "איטי"');
  assert.equal(ex[2].reps, 12);
  assert.equal(w.source_text, 'אימון\nריצה 2 ק"מ\nלחיצה 3x8 20 ק"ג\nסקוואט 3x12 "איטי"');
});
