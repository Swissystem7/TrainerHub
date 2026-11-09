'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');

function entry(id, he, muscles) {
  return { id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner', file: he + '.mp4', source: 'local' };
}

const CATALOG = {
  warmup: entry('warmup', 'חימום', ['core']),
  squat: entry('squat', 'סקוואט', ['legs']),
  pushup: entry('pushup', 'שכיבות סמיכה', ['chest']),
  plank: entry('plank', 'פלאנק', ['core']),
};

test('normalizeDurationMinutes maps negative/zero/NaN to 20 and keeps 30', () => {
  assert.equal(Engine.normalizeDurationMinutes(-15), 20);
  assert.equal(Engine.normalizeDurationMinutes(0), 20);
  assert.equal(Engine.normalizeDurationMinutes(Number.NaN), 20);
  assert.equal(Engine.normalizeDurationMinutes(30), 30);
});

test('negative requested duration becomes a 20-minute plan with no negative label', () => {
  const built = Engine.buildSession({ duration: -15, durationSpecified: true, muscles: [], equipment: [], level: null, goal: null }, CATALOG);
  assert.equal(built.workout.duration_minutes, 20);
  assert.equal(built.request.duration, 20);
  assert.match(built.workout.title || '', /20\s*דקות/);
  assert.ok(!/[^0-9-](?:-15)\b/.test(built.workout.title || ''));
  assert.ok(!/(?:^|[^0-9])0\s*דקות/.test(built.workout.title || ''));
});

test('zero/NaN duration defaults to 20 minutes', () => {
  const zero = Engine.buildSession({ duration: 0, durationSpecified: true, muscles: [], equipment: [], level: null, goal: null }, CATALOG);
  const nan = Engine.buildSession({ duration: Number.NaN, durationSpecified: true, muscles: [], equipment: [], level: null, goal: null }, CATALOG);
  assert.equal(zero.workout.duration_minutes, 20);
  assert.equal(nan.workout.duration_minutes, 20);
});

test('valid duration 30 stays 30', () => {
  const built = Engine.buildSession({ duration: 30, durationSpecified: true, muscles: [], equipment: [], level: null, goal: null }, CATALOG);
  assert.equal(built.workout.duration_minutes, 30);
  assert.equal(built.request.duration, 30);
  assert.match(built.workout.title || '', /30/);
});
