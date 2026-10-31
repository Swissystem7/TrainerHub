'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');

function firstDay(goal, level) {
  const program = TH.generateWorkoutProgram({
    goals: [goal], fitnessLevel: level, age: 30, availableEquipment: ['dumbbells'], previousWorkouts: 10
  }, 1, 3);
  return program.dailyWorkouts[0];
}

test('a short beginner program day is not promised as 45 minutes', function () {
  const w = TH.toPhasesWorkout(firstDay('hypertrophy', 'beginner'), {});
  assert.equal(w.phases[1].exercises.length, 4);
  assert.ok(w.duration_minutes < 30, 'got ' + w.duration_minutes);
});

test('a long advanced strength day is not cut to 45 minutes', function () {
  const w = TH.toPhasesWorkout(firstDay('strength', 'advanced'), {});
  assert.equal(w.phases[1].exercises.length, 6);
  assert.ok(w.duration_minutes > 45, 'got ' + w.duration_minutes);
});

test('the workout total is the sum of its phases', function () {
  const w = TH.toPhasesWorkout(firstDay('endurance', 'intermediate'), {});
  const sum = w.phases.reduce(function (a, ph) { return a + ph.duration_minutes; }, 0);
  assert.equal(w.duration_minutes, sum);
});

test('a day without phases gets its Main minutes from sets, reps and rest', function () {
  const w = TH.toPhasesWorkout({
    day: 1,
    exercises: [{ name: 'squat', sets: 3, reps: '10', restSeconds: 60 }]
  }, {});
  // 3 × 10 reps × 3 s + 2 × 60 s rest = 210 s ≈ 4 minutes
  assert.equal(w.phases[1].duration_minutes, 4);
  assert.equal(w.duration_minutes, 14);
});

test('a stored day with its own duration keeps it', function () {
  const w = TH.toPhasesWorkout({ duration_minutes: 50, phases: [{ name: 'Main', duration_minutes: 20, exercises: [] }] }, {});
  assert.equal(w.duration_minutes, 50);
});
