'use strict';

// A pasted workout puts every line in the Main phase, so a trainer who wrote
// "חימום 5 דקות" still got the "חסר חימום" flag. The analyzer now recognises a
// warm-up exercise wherever it sits, not only inside the Warm-up phase.

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');
const Ingest = require('../js/ingest.js');

function flagKeys(workout) {
  return Analyzer.analyzeSession(workout).flags.map(function (f) { return f.key; });
}

function mainOnly(exercises) {
  return {
    title: 'אימון',
    duration_minutes: 20,
    phases: [
      { name: 'Warm-up', duration_minutes: 0, exercises: [] },
      { name: 'Main', duration_minutes: 20, exercises: exercises },
      { name: 'Cool-down', duration_minutes: 0, exercises: [] }
    ]
  };
}

const squat = { name: 'סקוואט', id: 'squat', sets: 3, reps: 12, rest_seconds: 45 };
const row = { name: 'מתח אוסטרלי', id: 'bodyweight_row', sets: 3, reps: 8, rest_seconds: 45 };

test('no warm-up anywhere still raises the flag', function () {
  assert.ok(flagKeys(mainOnly([squat, row])).indexOf('no-warmup') !== -1);
});

test('the warm-up clip in the Main phase (pasted workout) counts as a warm-up', function () {
  const warm = { name: 'חימום', id: 'warmup', sets: 1, reps: null, duration_seconds: 300, rest_seconds: null };
  assert.equal(flagKeys(mainOnly([warm, squat, row])).indexOf('no-warmup'), -1);
});

test('a "חימום" line that never matched the catalog (id null) still counts', function () {
  const warm = { name: 'חימום', id: null, sets: 1, reps: null, duration_seconds: 300, missing: true };
  assert.equal(flagKeys(mainOnly([warm, squat, row])).indexOf('no-warmup'), -1);
  const dynamic = { name: 'חימום דינמי', id: null, sets: 1, reps: null, duration_seconds: 240 };
  assert.equal(flagKeys(mainOnly([dynamic, squat, row])).indexOf('no-warmup'), -1);
});

test('a word that merely contains חימום is not a warm-up', function () {
  assert.equal(Analyzer.isWarmupExercise({ name: 'תרגיל ללא חימום' }), false);
  assert.equal(Analyzer.isWarmupExercise({ name: 'סקוואט' }), false);
  assert.equal(Analyzer.isWarmupExercise(null), false);
});

test('a populated Warm-up phase keeps working as before', function () {
  const workout = {
    phases: [
      { name: 'Warm-up', duration_minutes: 5, exercises: [{ name: 'ריצה קלה', sets: 1, duration_seconds: 300 }] },
      { name: 'Main', duration_minutes: 15, exercises: [squat, row] }
    ]
  };
  assert.equal(Analyzer.hasWarmup(workout, Analyzer.flattenWorkout(workout)), true);
  assert.equal(flagKeys(workout).indexOf('no-warmup'), -1);
});

test('flat exercise lists (no phases) are checked too', function () {
  assert.ok(flagKeys([squat, row]).indexOf('no-warmup') !== -1);
  assert.equal(flagKeys([{ name: 'חימום', sets: 1, duration_seconds: 300 }, squat, row]).indexOf('no-warmup'), -1);
});

test('end to end: a pasted workout that opens with a warm-up line is not flagged', function () {
  const text = 'חימום 5 דקות\nסקוואט 3x12\nשכיבות סמיכה 3x10\nמתח אוסטרלי 3x8';
  const r = Ingest.ingestText(text, []);
  assert.equal(r.workout.phases[1].name, 'Main');
  assert.ok(r.workout.phases[1].exercises.some(Analyzer.isWarmupExercise));
  assert.equal(flagKeys(r.workout).indexOf('no-warmup'), -1);
});
