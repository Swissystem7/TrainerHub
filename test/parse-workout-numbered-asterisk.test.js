'use strict';

// Regression: a WhatsApp-style list «1. סקוואט 3*15» came out as an exercise named
// «1 סקוואט 3*15» with 1×10 - the studio parser kept the list number and only knew
// «x» / «×» between sets and reps, not «*». WhatsApp bold «*בורפי*» kept a star too.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('a numbered list with «*» between sets and reps', () => {
  const ex = main([
    '1. סקוואט 3*15',
    '2. פלאנק 3*45 שניות',
    '3) לאנג׳ים 3 * 10 לכל רגל',
    '4. מתח 3*מקסימום'
  ].join('\n'));
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'פלאנק', 'לאנג׳ים', 'מתח']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[3, 15, null], [3, null, 45], [3, 10, null], [3, null, null]]);
  assert.equal(ex[3].notes, 'עד כשל');
});

test('WhatsApp bold stars are not part of the name', () => {
  const ex = main('*סקוואט* 3x10\n*בורפי* 4*12');
  assert.deepEqual(ex.map(function (e) { return [e.name, e.sets, e.reps]; }), [['סקוואט', 3, 10], ['בורפי', 4, 12]]);
});

test('a decimal at the start of a line is not a list number', () => {
  const ex = main('1.5 דקות ריצה');
  assert.equal(ex[0].name, 'ריצה');
  assert.equal(ex[0].duration_seconds, 90);
});
