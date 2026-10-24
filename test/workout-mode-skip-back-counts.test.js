'use strict';

// workout-mode counted a set as skipped forever: skipCurrent bumped skippedSets
// and goBack only undid completedStepIds. «דלג» → «חזור» → «סיימתי» therefore
// reported the same set as both done and skipped on the completion screen
// (statSets + «דולגו 1» in the WhatsApp summary and the TH1 result code).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

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

// Same shape buildSteps produces: exercise A ×2 with rest between sets, then B ×1.
function fixtureSteps() {
  return [
    { type: 'exercise', exercise: 0, id: 'pushup', name: 'שכיבות שמיכה', set: 1, totalSets: 2, reps: 10 },
    { type: 'rest', duration: 30, nextName: 'שכיבות שמיכה', nextDetail: '10 חזרות' },
    { type: 'exercise', exercise: 0, id: 'pushup', name: 'שכיבות שמיכה', set: 2, totalSets: 2, reps: 10 },
    { type: 'rest', duration: 30, nextName: 'סקוואט', nextDetail: '1×12' },
    { type: 'exercise', exercise: 1, id: 'squat', name: 'סקוואט', set: 1, totalSets: 1, reps: 12 }
  ];
}

// Runs a sequence of taps (done / skip / back, and a rest countdown ending) against the real page functions
// and returns the counters finishWorkout would print.
function play(taps) {
  const src = [
    'let stepIdx = 0, countdown = 0, finished = false;',
    'let completedSets = 0, completedExercises = 0, completedStepIds = new Set();',
    'let skippedSets = 0, skippedStepIds = new Set();',
    'function clearCountdown() {}',
    'function renderStep() {}',
    'function finishWorkout() { finished = true; }',
    extract('hasDoneSet'),
    extract('markSetDone'),
    extract('advance'),
    extract('skipCurrent'),
    extract('goBack'),
    'for (const tap of taps) {',
    '  if (tap === "done") markSetDone();',
    '  else if (tap === "skip") skipCurrent();',
    '  else if (tap === "back") goBack();',
    '  else if (tap === "rest") advance();',
    '}',
    'return { stepIdx, finished, sets: completedSets, exercises: completedExercises, skipped: skippedSets };'
  ].join('\n');
  return new Function('steps', 'taps', src)(fixtureSteps(), taps);
}

test('skip, back, done counts the set once as done and not as skipped', function () {
  const r = play(['skip', 'back', 'done', 'rest', 'done', 'rest', 'done']);
  assert.equal(r.finished, true);
  assert.equal(r.sets, 3);
  assert.equal(r.exercises, 2);
  assert.equal(r.skipped, 0);
});

test('back after a skip returns to the skipped set in one tap, not to its rest', function () {
  const r = play(['skip', 'back']);
  assert.equal(r.stepIdx, 0);
  assert.equal(r.skipped, 0);
});

test('a set that stays skipped is still reported as skipped', function () {
  const r = play(['done', 'rest', 'skip', 'done']);
  assert.equal(r.finished, true);
  assert.equal(r.sets, 2);
  assert.equal(r.exercises, 2);
  assert.equal(r.skipped, 1);
});

test('skip, back, skip again counts one skipped set', function () {
  const r = play(['skip', 'back', 'skip', 'done', 'rest', 'done']);
  assert.equal(r.finished, true);
  assert.equal(r.sets, 2);
  assert.equal(r.skipped, 1);
});

test('back after done still undoes the done count', function () {
  const r = play(['done', 'back']);
  assert.equal(r.stepIdx, 0);
  assert.equal(r.sets, 0);
  assert.equal(r.skipped, 0);
});

// completedExercises only counted an exercise when its LAST set was done, so
// doing set 1 and skipping set 2 reported «תרגילים 1» for two exercises done.
test('an exercise with its last set skipped still counts as done', function () {
  const r = play(['done', 'rest', 'skip', 'done']);
  assert.equal(r.exercises, 2);
});

test('an exercise counts once however many of its sets are done', function () {
  const r = play(['done', 'rest', 'done', 'rest', 'done']);
  assert.equal(r.sets, 3);
  assert.equal(r.exercises, 2);
});

test('back over the only done set of an exercise uncounts it, back over one of two does not', function () {
  assert.equal(play(['done', 'back']).exercises, 0);
  assert.equal(play(['done', 'rest', 'done', 'back']).exercises, 1);
});

test('an exercise with every set skipped is not counted', function () {
  const r = play(['skip', 'skip', 'done']);
  assert.equal(r.finished, true);
  assert.equal(r.exercises, 1);
  assert.equal(r.skipped, 2);
});
