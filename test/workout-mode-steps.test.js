'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/frontend/workout-mode.html',
  pathname: '/TrainerHub/frontend/workout-mode.html',
  hash: ''
};

const TH = require('../js/core.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

// buildSteps lives inline in workout-mode.html; lift the function source out
// of the page so the test runs the same code the browser runs.
function loadBuildSteps() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');
  const start = html.indexOf('function buildSteps(workout) {');
  assert.ok(start > -1, 'buildSteps is defined in workout-mode.html');
  // The page may be checked out with CRLF; accept either line ending.
  const endMatch = /\r?\n  return steps;\r?\n\}/.exec(html.slice(start));
  assert.ok(endMatch, 'buildSteps ends with return steps');
  const src = html.slice(start, start + endMatch.index + endMatch[0].length);
  return new Function('PHASE_LABELS', src + '\nreturn buildSteps;')(TH.PHASE_LABELS);
}

const buildSteps = loadBuildSteps();

function ex(name, sets, rest) {
  return { name: name, id: null, sets: sets, reps: 10, duration_seconds: null, rest_seconds: rest, notes: null };
}

test('a workout whose last phase is empty does not end on a rest step', function () {
  // The prompt engine and the pasted-workout ingest both emit
  // { name: 'Cool-down', exercises: [] } as the last phase.
  const steps = buildSteps({
    title: 't',
    phases: [
      { name: 'Warm-up', exercises: [ex('חימום', 1, 0)] },
      { name: 'Main', exercises: [ex('סקוואט', 2, 45), ex('שכיבות שמיכה', 2, 45)] },
      { name: 'Cool-down', exercises: [] }
    ]
  });
  const last = steps[steps.length - 1];
  assert.equal(last.type, 'exercise');
  assert.equal(last.name, 'שכיבות שמיכה');
  assert.equal(last.set, 2);
  // Rests between sets and between exercises are still there: 3 of them.
  assert.equal(steps.filter(function (s) { return s.type === 'rest'; }).length, 3);
});

test('the rest after the last exercise of a phase previews the first exercise of the next phase', function () {
  const steps = buildSteps({
    title: 't',
    phases: [
      { name: 'Warm-up', exercises: [ex('חימום', 1, 30)] },
      { name: 'Main', exercises: [ex('סקוואט', 3, 45)] },
      { name: 'Cool-down', exercises: [] }
    ]
  });
  assert.equal(steps[0].type, 'exercise');
  assert.equal(steps[1].type, 'rest');
  assert.equal(steps[1].nextName, 'סקוואט');
  assert.equal(steps[1].nextDetail, '3×10');
});

test('a non-empty last phase still gets its lead-in rest but no trailing one', function () {
  const steps = buildSteps({
    title: 't',
    phases: [
      { name: 'Main', exercises: [ex('סקוואט', 2, 45)] },
      { name: 'Cool-down', exercises: [ex('שחרור', 1, 30)] }
    ]
  });
  assert.deepEqual(steps.map(function (s) { return s.type; }), ['exercise', 'rest', 'exercise', 'rest', 'exercise']);
  assert.equal(steps[1].nextName, 'סקוואט');
  assert.equal(steps[3].nextName, 'שחרור');
  assert.equal(steps[4].phase, 'שחרור');
});

test('a prompt-engine workout flattens to steps that end on an exercise', function () {
  const built = buildSession('אימון רגליים 20 דקות בלי ציוד', catalog);
  assert.ok(built.workout);
  const phases = built.workout.phases;
  assert.equal(phases[phases.length - 1].name, 'Cool-down');
  const steps = buildSteps(built.workout);
  assert.ok(steps.length > 1);
  assert.equal(steps[steps.length - 1].type, 'exercise');
});
