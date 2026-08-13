'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
TH.setCatalog({});

const root = path.join(__dirname, '..');
const weekly = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const studio = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');
const workoutMode = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

const PHASE_NAMES = ['Warm-up', 'Main', 'Cool-down'];

function profile() {
  return {
    age: 31,
    gender: 'other',
    fitnessLevel: 'intermediate',
    goals: ['hypertrophy'],
    availableEquipment: ['dumbbells'],
    targetMuscles: [],
    injuries: [],
    previousWorkouts: 8
  };
}

function assertPhaseSchema(phases, label) {
  assert.ok(Array.isArray(phases) && phases.length === 3, label + ' needs 3 phases');
  phases.forEach(function (phase, i) {
    assert.equal(phase.name, PHASE_NAMES[i], label + ' phase ' + i);
    assert.ok(Array.isArray(phase.exercises), label + ' ' + phase.name + ' exercises');
    for (const ex of phase.exercises) {
      assert.equal(typeof ex.name, 'string');
      assert.ok('id' in ex);
      assert.ok('sets' in ex);
      assert.ok('reps' in ex);
      assert.ok('duration_seconds' in ex);
      assert.ok('rest_seconds' in ex);
    }
  });
}

test('generateWorkoutProgram emits the shared Warm-up / Main / Cool-down schema', function () {
  const program = TH.generateWorkoutProgram(profile(), 1, 3);
  assert.ok(program.dailyWorkouts.length >= 1);
  for (const day of program.dailyWorkouts) {
    assertPhaseSchema(day.phases, 'day ' + day.day);
    const main = day.phases[1].exercises;
    assert.ok(main.length >= 1);
    assert.equal(main[0].sets, 3);
    assert.equal(main[0].rest_seconds, 60);
  }
});

test('toPhasesWorkout is a lossless view of a daily workout for workout-mode', function () {
  const program = TH.generateWorkoutProgram(profile(), 1, 1);
  const day = program.dailyWorkouts[0];
  const workout = TH.toPhasesWorkout(day, { equipment: ['משקולות'], intensity: 'medium' });
  assert.equal(workout.title, day.title);
  assertPhaseSchema(workout.phases, 'toPhasesWorkout');
  assert.equal(workout.phases[1].exercises.length, day.exercises.length);
  assert.equal(workout.phases[1].exercises[0].id, day.exercises[0].name);
  assert.equal(TH.phaseLabel('Warm-up'), 'חימום');
  assert.equal(TH.phaseLabel('Main'), 'עיקר');
  assert.equal(TH.phaseLabel('Cool-down'), 'שחרור');
});

test('compactPlan / expandPlan keep the phase contract the journal later imports', function () {
  const program = TH.generateWorkoutProgram(profile(), 1, 1);
  const workout = TH.toPhasesWorkout(program.dailyWorkouts[0], {});
  const compact = TH.compactPlan(workout);
  assert.equal(compact.p.length, 3);
  assert.equal(compact.p[0].n, 'Warm-up');
  assert.equal(compact.p[1].n, 'Main');
  assert.ok(compact.p[1].e[0].s);
  assert.ok(compact.p[1].e[0].r);
  const expanded = TH.expandPlan(compact);
  assertPhaseSchema(expanded.phases, 'expandPlan');
  assert.equal(expanded.phases[1].exercises[0].id, workout.phases[1].exercises[0].id);
  assert.equal(expanded.phases[1].exercises[0].sets, workout.phases[1].exercises[0].sets);
  assert.equal(expanded.phases[1].exercises[0].rest_seconds, workout.phases[1].exercises[0].rest_seconds);
});

test('weekly builder, studio, and workout-mode all consume the same phases fields', function () {
  assert.match(weekly, /TH\.toPhasesWorkout/);
  assert.match(weekly, /TH\.phaseLabel/);
  assert.match(weekly, /w\.phases/);
  assert.match(weekly, /frontend\/workout-mode\.html/);

  assert.match(studio, /w\.phases/);
  assert.match(studio, /'Warm-up'/);
  assert.match(studio, /'Cool-down'/);
  assert.match(studio, /workout-mode\.html/);
  assert.match(studio, /TH\.store\.set\(TH\.KEYS\.active/);

  assert.match(workoutMode, /TH\.PHASE_LABELS/);
  assert.match(workoutMode, /workout\.phases/);
  assert.match(workoutMode, /ex\.duration_seconds/);
  assert.match(workoutMode, /ex\.rest_seconds/);
  assert.match(workoutMode, /ThLink\.decodeHash/);
  assert.match(workoutMode, /ThLink\.encodeResult/);
  assert.equal(TH.PHASE_LABELS['Warm-up'], 'חימום');
  assert.equal(TH.PHASE_LABELS['Main'], 'עיקר');
  assert.equal(TH.PHASE_LABELS['Cool-down'], 'שחרור');
});
