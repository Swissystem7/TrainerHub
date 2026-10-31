'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// buildSteps and exerciseProgress live inline in workout-mode.html; lift their
// source out of the page so the test runs the same code the browser runs.
const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');

function lift(signature, end) {
  const start = html.indexOf(signature);
  assert.ok(start > -1, signature + ' is defined in workout-mode.html');
  const endMatch = end.exec(html.slice(start));
  assert.ok(endMatch, signature + ' has its closing line');
  return html.slice(start, start + endMatch.index + endMatch[0].length);
}

const src = lift('function buildSteps(workout) {', /\r?\n  return steps;\r?\n\}/) + '\n' +
  lift('function exerciseProgress(steps, stepIdx) {', /\r?\n  return \{ current, total, pct[^\n]*\r?\n\}/);
const { buildSteps, exerciseProgress } = new Function('PHASE_LABELS',
  src + '\nreturn { buildSteps, exerciseProgress };')({});

function ex(name, sets) {
  return { name: name, id: null, sets: sets, reps: 10, duration_seconds: null, rest_seconds: 30, notes: null };
}

const steps = buildSteps({
  title: 't',
  phases: [
    { name: 'Main', exercises: ['סקוואט', 'שכיבות סמיכה', 'לאנג׳', 'חתירה', 'פלאנק', 'בורפי'].map(n => ex(n, 3)) },
    { name: 'Cool-down', exercises: [] }
  ]
});

test('the first step of a 6-exercise, 3-set plan reads «תרגיל 1 מתוך 6», not «0 מתוך 18»', function () {
  const p = exerciseProgress(steps, 0);
  assert.equal(p.current, 1);
  assert.equal(p.total, 6);
  assert.equal(p.pct, 0);
});

test('every set of an exercise and the rests after it keep that exercise number', function () {
  const secondEx = steps.findIndex(s => s.name === 'שכיבות סמיכה');
  for (let i = 0; i < secondEx; i++) assert.equal(exerciseProgress(steps, i).current, 1, 'step ' + i);
  assert.equal(exerciseProgress(steps, secondEx).current, 2);
});

test('the last set shows the last exercise and the bar fills by sets behind', function () {
  const last = steps.length - 1;
  const p = exerciseProgress(steps, last);
  assert.equal(p.current, 6);
  assert.equal(p.total, 6);
  assert.equal(Math.round(p.pct), Math.round(17 / 18 * 100));
});
