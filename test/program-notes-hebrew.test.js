'use strict';

// The program builder tags exercises with notes for new trainees ("focus on
// form") and seniors ("low intensity"). Those notes are trainee-facing: the
// journal's «בנה ושייך אימון» builds with previousWorkouts: 0, so every
// exercise carried "💡 focus on form" into workout-mode, the print sheet and
// the shared link of an otherwise Hebrew app.

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
TH.setCatalog({});

const LATIN = /[A-Za-z]/;

function mainNotes(program) {
  const notes = [];
  program.dailyWorkouts.forEach(function (day) {
    (day.exercises || []).forEach(function (ex) { notes.push(ex.notes); });
    const main = (day.phases || []).filter(function (p) { return p.name === 'Main'; })[0];
    ((main && main.exercises) || []).forEach(function (ex) { notes.push(ex.notes); });
  });
  return notes;
}

test('a new trainee gets a Hebrew technique note, not "focus on form"', function () {
  const program = TH.generateWorkoutProgram({
    fitnessLevel: 'beginner', goals: ['general_fitness'], availableEquipment: ['none'],
    targetMuscles: [], injuries: [], previousWorkouts: 0, preferCatalog: true
  }, 1, 1);
  const notes = mainNotes(program);
  assert.ok(notes.length > 0);
  notes.forEach(function (n) {
    assert.equal(typeof n, 'string');
    assert.doesNotMatch(n, LATIN);
    assert.match(n, /טכניקה/);
  });
});

test('a senior gets the Hebrew low-intensity note, joined the way the app joins labels', function () {
  const program = TH.generateWorkoutProgram({
    age: 70, fitnessLevel: 'beginner', goals: ['strength'], availableEquipment: ['none'],
    targetMuscles: [], injuries: [], previousWorkouts: 0
  }, 1, 1);
  const notes = mainNotes(program);
  assert.ok(notes.length > 0);
  notes.forEach(function (n) {
    assert.doesNotMatch(n, LATIN);
    assert.match(n, /עצימות נמוכה/);
    assert.match(n, /טכניקה/);
    assert.doesNotMatch(n, /;/);
  });
  const senior = TH.generateWorkoutProgram({ age: 70, previousWorkouts: 20 }, 1, 1);
  mainNotes(senior).forEach(function (n) {
    assert.equal(n, 'עצימות נמוכה');
  });
});

test('an experienced adult still gets no note at all', function () {
  const program = TH.generateWorkoutProgram({ age: 31, previousWorkouts: 8 }, 1, 2);
  mainNotes(program).forEach(function (n) {
    assert.ok(n == null || n === '');
  });
});

test('the notes survive the shared-link round trip in Hebrew', function () {
  const program = TH.generateWorkoutProgram({ previousWorkouts: 0 }, 1, 1);
  const workout = TH.toPhasesWorkout(program.dailyWorkouts[0], {});
  const back = TH.expandPlan(TH.compactPlan(workout));
  const main = back.phases.filter(function (p) { return p.name === 'Main'; })[0];
  assert.ok(main.exercises.length > 0);
  main.exercises.forEach(function (ex) {
    assert.equal(ex.notes, 'דגש על טכניקה');
  });
  const printed = TH.workoutPrintModel(back, {});
  const printedMain = printed.phases.filter(function (p) { return p.name === 'עיקר'; })[0];
  assert.equal(printedMain.exercises[0].notes, 'דגש על טכניקה');
});
