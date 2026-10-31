'use strict';

// A pasted pyramid «5-10-15-10-5 שכיבות סמיכה» is ingested as 5 sets of 5 reps with the ladder in
// the notes. workout-mode showed «5 חזרות» on every set (the 15-rep top too), and a timed ladder
// «פלאנק 30-45-60 שניות» ran a 30-second timer on all three sets. Each set now takes its own count.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TH = require('../js/core.js');
const ingest = require('../js/ingest.js');

function loadBuildSteps() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');
  const start = html.indexOf('function buildSteps(workout) {');
  assert.ok(start > -1, 'buildSteps is defined in workout-mode.html');
  const endMatch = /\r?\n  return steps;\r?\n\}/.exec(html.slice(start));
  assert.ok(endMatch, 'buildSteps ends with return steps');
  const src = html.slice(start, start + endMatch.index + endMatch[0].length);
  return new Function('PHASE_LABELS', src + '\nreturn buildSteps;')(TH.PHASE_LABELS);
}

const buildSteps = loadBuildSteps();

function stepsFor(text) {
  return buildSteps(ingest.ingestText(text).workout);
}

test('a pasted rep pyramid gives each set its own reps', () => {
  const steps = stepsFor('5-10-15-10-5 שכיבות סמיכה, מנוחה 60 שניות');
  const sets = steps.filter(s => s.type === 'exercise');
  assert.deepEqual(sets.map(s => s.reps), [5, 10, 15, 10, 5]);
  const rests = steps.filter(s => s.type === 'rest');
  assert.deepEqual(rests.map(s => s.nextDetail), ['10 חזרות', '15 חזרות', '10 חזרות', '5 חזרות']);
});

test('a descending ladder after the name works the same', () => {
  const sets = stepsFor('סקוואט 10-8-6').filter(s => s.type === 'exercise');
  assert.deepEqual(sets.map(s => s.reps), [10, 8, 6]);
});

test('a timed ladder runs each set for its own time', () => {
  const sets = stepsFor('פלאנק 30-45-60 שניות').filter(s => s.type === 'exercise');
  assert.deepEqual(sets.map(s => s.duration), [30, 45, 60]);
  assert.deepEqual(sets.map(s => s.reps), [null, null, null]);
});

test('a ladder with stated sets that differ keeps the flat prescription', () => {
  const steps = buildSteps({ phases: [{ name: 'Main', exercises: [
    { name: 'דדליפט', sets: 4, reps: 8, notes: '8/6/4' }
  ] }] });
  assert.deepEqual(steps.filter(s => s.type === 'exercise').map(s => s.reps), [8, 8, 8, 8]);
});

test('notes that only mention numbers later do not change the reps', () => {
  const steps = buildSteps({ phases: [{ name: 'Main', exercises: [
    { name: 'לחיצת חזה', sets: 3, reps: 10, notes: 'טמפו 3-1-1' }
  ] }] });
  assert.deepEqual(steps.filter(s => s.type === 'exercise').map(s => s.reps), [10, 10, 10]);
});
