'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
TH.setCatalog({});

const BARBELL_OR_MACHINE = new Set([
  'squat', 'deadlift', 'leg_press', 'bench_press', 'incline_press',
  'barbell_row', 'lat_pulldown', 'overhead_press', 'upright_row',
  'tricep_pushdown', 'dips', 'pull_up'
]);
const DUMBBELL_ONLY = new Set([
  'goblet_squat', 'dumbbell_lunge', 'romanian_deadlift_db', 'dumbbell_bench',
  'dumbbell_fly', 'dumbbell_incline', 'dumbbell_row', 'reverse_fly',
  'dumbbell_ohp', 'lateral_raise', 'front_raise', 'bicep_curl',
  'hammer_curl', 'concentration_curl', 'overhead_extension', 'tricep_kickback'
]);
const SPLIT_MUSCLES = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps'],
  legs: ['legs'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['legs', 'core'],
  full: ['chest', 'back', 'shoulders', 'legs', 'core']
};
const EXERCISE_MUSCLES = {
  bodyweight_squat: ['legs'], lunges: ['legs'], glute_bridge: ['legs'],
  step_up: ['legs'], wall_sit: ['legs'], calf_raise: ['legs'],
  goblet_squat: ['legs'], dumbbell_lunge: ['legs'], romanian_deadlift_db: ['legs'],
  squat: ['legs'], deadlift: ['legs', 'back'], leg_press: ['legs'],
  push_up: ['chest'], wide_push_up: ['chest'], dumbbell_bench: ['chest'],
  dumbbell_fly: ['chest'], bench_press: ['chest'],
  superman: ['back'], bodyweight_row: ['back'], dumbbell_row: ['back'],
  barbell_row: ['back'], pull_up: ['back'], lat_pulldown: ['back'],
  pike_push_up: ['shoulders'], arm_circles: ['shoulders'],
  dumbbell_ohp: ['shoulders'], lateral_raise: ['shoulders'],
  overhead_press: ['shoulders'],
  bodyweight_curl: ['biceps'], bicep_curl: ['biceps'], hammer_curl: ['biceps'],
  bench_dips: ['triceps'], tricep_push_up: ['triceps'],
  overhead_extension: ['triceps'], tricep_pushdown: ['triceps'],
  plank: ['core'], crunches: ['core'], russian_twist: ['core'],
  leg_raise: ['core'], mountain_climber: ['core']
};

function profile(overrides) {
  return Object.assign({
    age: 31,
    gender: 'other',
    fitnessLevel: 'intermediate',
    goals: ['hypertrophy'],
    availableEquipment: ['none'],
    targetMuscles: [],
    injuries: [],
    previousWorkouts: 8
  }, overrides);
}

function mainExercises(program) {
  return program.dailyWorkouts.flatMap(function (day) {
    return day.exercises || [];
  });
}

test('strength maps to 4 sets, 4-6 reps, 120s rest', function () {
  const program = TH.generateWorkoutProgram(profile({ goals: ['strength'] }), 1, 1);
  const ex = program.dailyWorkouts[0].exercises[0];
  assert.equal(ex.sets, 4);
  assert.equal(ex.reps, '4-6');
  assert.equal(ex.restSeconds, 120);
  assert.equal(ex.rest_seconds, 120);
});

test('hypertrophy and muscle_gain share 3x8-12 / 60s', function () {
  for (const goal of ['hypertrophy', 'muscle_gain']) {
    const program = TH.generateWorkoutProgram(profile({ goals: [goal] }), 1, 1);
    const ex = program.dailyWorkouts[0].exercises[0];
    assert.equal(ex.sets, 3, goal);
    assert.equal(ex.reps, '8-12', goal);
    assert.equal(ex.restSeconds, 60, goal);
  }
});

test('endurance maps to 3x12-15 / 45s', function () {
  const program = TH.generateWorkoutProgram(profile({ goals: ['endurance'] }), 1, 1);
  const ex = program.dailyWorkouts[0].exercises[0];
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, '12-15');
  assert.equal(ex.restSeconds, 45);
});

test('general_fitness falls back to the hypertrophy prescription', function () {
  const program = TH.generateWorkoutProgram(profile({ goals: ['general_fitness'] }), 1, 1);
  const ex = program.dailyWorkouts[0].exercises[0];
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, '8-12');
  assert.equal(ex.restSeconds, 60);
});

test('seniors keep at most 3 sets and at least 90s rest', function () {
  const program = TH.generateWorkoutProgram(profile({
    age: 72,
    goals: ['strength']
  }), 1, 1);
  const ex = program.dailyWorkouts[0].exercises[0];
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, '4-6');
  assert.equal(ex.restSeconds, 120);
  assert.ok(program.dailyWorkouts[0].exercises.length <= 4);
});

test('bodyweight equipment never picks barbell, machine, or dumbbell-only moves', function () {
  const program = TH.generateWorkoutProgram(profile({
    availableEquipment: ['none']
  }), 1, 3);
  const names = mainExercises(program).map(function (ex) { return ex.name; });
  assert.ok(names.length > 0);
  for (const name of names) {
    assert.equal(BARBELL_OR_MACHINE.has(name), false, name);
    assert.equal(DUMBBELL_ONLY.has(name), false, name);
  }
});

test('dumbbells keep bodyweight and dumbbell moves, not machines or a bar', function () {
  const program = TH.generateWorkoutProgram(profile({
    availableEquipment: ['dumbbells']
  }), 1, 3);
  const names = mainExercises(program).map(function (ex) { return ex.name; });
  assert.ok(names.length > 0);
  assert.ok(names.some(function (name) { return DUMBBELL_ONLY.has(name); }),
    'expected at least one dumbbell-only move when dumbbells are available');
  for (const name of names) {
    assert.equal(BARBELL_OR_MACHINE.has(name), false, name);
  }
});

test('dayIndex drives the muscle split for 1–5 training days', function () {
  const expected = {
    1: ['full'],
    2: ['upper', 'lower'],
    3: ['push', 'pull', 'legs'],
    4: ['upper', 'lower', 'upper', 'lower'],
    5: ['push', 'pull', 'legs', 'upper', 'lower']
  };
  for (const [days, splits] of Object.entries(expected)) {
    const program = TH.generateWorkoutProgram(profile({ targetMuscles: [] }), 1, Number(days));
    assert.equal(program.dailyWorkouts.length, Number(days));
    program.dailyWorkouts.forEach(function (day, dayIndex) {
      assert.equal(day.split, splits[dayIndex], 'days=' + days + ' day=' + dayIndex);
      const allowed = SPLIT_MUSCLES[day.split];
      for (const ex of day.exercises) {
        const muscles = EXERCISE_MUSCLES[ex.name];
        assert.ok(muscles, 'unknown exercise ' + ex.name);
        assert.ok(muscles.some(function (m) { return allowed.indexOf(m) !== -1; }),
          ex.name + ' does not belong on ' + day.split);
      }
    });
  }
});

test('an explicit target muscle pins every day to that focus split', function () {
  const program = TH.generateWorkoutProgram(profile({
    targetMuscles: ['chest']
  }), 1, 3);
  program.dailyWorkouts.forEach(function (day) {
    assert.equal(day.split, 'focus');
    for (const ex of day.exercises) {
      const muscles = EXERCISE_MUSCLES[ex.name];
      assert.ok(muscles && muscles.indexOf('chest') !== -1, ex.name);
    }
  });
});
