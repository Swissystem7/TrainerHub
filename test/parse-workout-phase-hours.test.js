'use strict';

// Regression: Creator Studio's client parser read a duration as the first whole
// number before «דק». «חימום 2.5 דקות» was a 5-minute warm-up, «חימום דקה וחצי»
// 5 minutes, and hours were never read: «אימון של שעה» was a 30-minute session.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function phase(w, name) {
  return w.phases.find(function (p) { return p.name === name; });
}

test('fractional minutes in a phase header', () => {
  const w = parseWorkoutClient('אימון מעגלי\nחימום 2.5 דקות\nסקוואט 3x12\nשחרור 2.5 דקות');
  assert.equal(phase(w, 'Warm-up').duration_minutes, 2.5);
  assert.equal(phase(w, 'Cool-down').duration_minutes, 2.5);
  assert.equal(phase(w, 'Warm-up').exercises[0].duration_seconds, 150);
  assert.equal(phase(w, 'Main').duration_minutes, 25);
});

test('«דקה וחצי» in a phase header', () => {
  const w = parseWorkoutClient('אימון כוח\nחימום דקה וחצי: קפיצות\nסקוואט 3x12');
  assert.equal(phase(w, 'Warm-up').duration_minutes, 1.5);
});

test('session length in hours', () => {
  const cases = [
    ['אימון של שעה', 60, 'אימון'],
    ['אימון כוח של שעה וחצי', 90, 'אימון כוח'],
    ['אימון 1.5 שעות', 90, 'אימון'],
    ['אימון שעתיים', 120, 'אימון'],
    ['אימון רבע שעה', 15, 'אימון']
  ];
  cases.forEach(function (c) {
    const w = parseWorkoutClient(c[0] + '\nסקוואט 3x12');
    assert.equal(w.duration_minutes, c[1], c[0]);
    assert.equal(w.title, c[2], c[0]);
  });
});

test('a «סה"כ» line sets the length and is not an exercise', () => {
  const w = parseWorkoutClient('אימון בוקר\nסקוואט 3x12\nסה"כ שעה');
  assert.equal(w.duration_minutes, 60);
  assert.deepEqual(phase(w, 'Main').exercises.map(function (e) { return e.name; }), ['סקוואט']);
});

test('unchanged: whole minutes, a clock time, and «בשעה»', () => {
  const w = parseWorkoutClient('אימון כוח, 45 דקות\nחימום 10 דקות\nסקוואט 3x12');
  assert.equal(w.duration_minutes, 45);
  assert.equal(w.title, 'אימון כוח');
  assert.equal(phase(w, 'Warm-up').duration_minutes, 10);
  const clock = parseWorkoutClient('אימון בשעה 18:00\nסקוואט 3x12');
  assert.equal(clock.duration_minutes, 30);
  assert.equal(clock.title, 'אימון בשעה 18:00');
});
