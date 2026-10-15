'use strict';

// workout-mode applySwap renames the steps on screen after TH.swapExerciseById
// swaps the workout. It matched steps with `s.id === oldId`, so when the
// current step had no catalog id (a pasted line with no clip, id null) every
// other id-less step matched too: swapping «תרגיל א» renamed «תרגיל ב» on
// screen as well, while the workout (and the TH1 completion code) kept ב.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
const TH = require(path.join(root, 'js', 'core.js'));

function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name + ' exists in workout-mode.html');
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

TH.setCatalog({
  pushup: { he: 'שכיבות שמיכה', muscles: ['chest'], equipment: ['none'], level: 'beginner', file: 'videos/pushup.mp4', source: 'local' },
  squat: { he: 'סקוואט', muscles: ['legs'], equipment: ['none'], level: 'beginner', file: 'videos/squat.mp4', source: 'local' }
});

// Same shape buildSteps produces: a rest step before a set previews that set.
function pastedWorkout() {
  const workout = { title: 'אימון שנקלט', phases: [{ name: 'Main', exercises: [
    { name: 'תרגיל בלי סרטון א', id: null, sets: 2, reps: 10, duration_seconds: null, rest_seconds: 30, notes: null },
    { name: 'תרגיל בלי סרטון ב', id: null, sets: 1, reps: 12, duration_seconds: null, rest_seconds: 0, notes: null }
  ] }] };
  const steps = [
    { type: 'exercise', id: null, name: 'תרגיל בלי סרטון א', set: 1, totalSets: 2, reps: 10 },
    { type: 'rest', duration: 30, nextName: 'תרגיל בלי סרטון א', nextDetail: '10 חזרות' },
    { type: 'exercise', id: null, name: 'תרגיל בלי סרטון א', set: 2, totalSets: 2, reps: 10 },
    { type: 'rest', duration: 30, nextName: 'תרגיל בלי סרטון ב', nextDetail: '1×12' },
    { type: 'exercise', id: null, name: 'תרגיל בלי סרטון ב', set: 1, totalSets: 1, reps: 12 }
  ];
  return { workout, steps };
}

function swapAt(fixture, stepIdx, newId) {
  const run = new Function(
    'document', 'TH', 'esc', 'announceStatus', 'renderStep', 'steps', 'stepIdx', 'workout',
    extract('applySwap') + '\napplySwap(newId);'.replace('newId', JSON.stringify(newId))
  );
  run({ getElementById: function () { return null; } }, TH, String, function () {}, function () {},
    fixture.steps, stepIdx, fixture.workout);
  return fixture;
}

function stepNames(steps) {
  return steps.filter(function (s) { return s.type === 'exercise'; }).map(function (s) { return s.name; });
}

test('swapping an exercise with no catalog id leaves the other id-less exercises alone', function () {
  const f = swapAt(pastedWorkout(), 0, 'pushup');
  assert.deepEqual(stepNames(f.steps), ['שכיבות שמיכה', 'שכיבות שמיכה', 'תרגיל בלי סרטון ב']);
  assert.equal(f.steps[4].id, null);
  assert.equal(f.steps[0].id, 'pushup');
});

test('the steps on screen match the workout the completion code reports', function () {
  const f = swapAt(pastedWorkout(), 0, 'pushup');
  const inWorkout = f.workout.phases[0].exercises.map(function (ex) { return ex.name; });
  assert.deepEqual(inWorkout, ['שכיבות שמיכה', 'תרגיל בלי סרטון ב']);
  const uniqueOnScreen = stepNames(f.steps).filter(function (n, i, a) { return a.indexOf(n) === i; });
  assert.deepEqual(uniqueOnScreen, inWorkout);
});

test('the rest preview is renamed only before the swapped sets', function () {
  const f = swapAt(pastedWorkout(), 0, 'pushup');
  assert.equal(f.steps[1].nextName, 'שכיבות שמיכה');
  assert.equal(f.steps[3].nextName, 'תרגיל בלי סרטון ב');
});

test('swapping the second id-less exercise does not touch the first', function () {
  const f = swapAt(pastedWorkout(), 4, 'squat');
  assert.deepEqual(stepNames(f.steps), ['תרגיל בלי סרטון א', 'תרגיל בלי סרטון א', 'סקוואט']);
  assert.equal(f.steps[3].nextName, 'סקוואט');
  assert.equal(f.steps[1].nextName, 'תרגיל בלי סרטון א');
});

test('a step with a catalog id still swaps every set of that exercise', function () {
  const f = pastedWorkout();
  f.workout.phases[0].exercises[0].id = 'pushup';
  f.workout.phases[0].exercises[0].name = 'שכיבות שמיכה';
  f.steps[0].id = f.steps[2].id = 'pushup';
  f.steps[0].name = f.steps[2].name = f.steps[1].nextName = 'שכיבות שמיכה';
  swapAt(f, 2, 'squat');
  assert.deepEqual(stepNames(f.steps), ['סקוואט', 'סקוואט', 'תרגיל בלי סרטון ב']);
  assert.equal(f.workout.phases[0].exercises[0].id, 'squat');
  assert.equal(f.workout.phases[0].exercises[1].name, 'תרגיל בלי סרטון ב');
});
