'use strict';

// The weekly builder (weekly.html, journal.html coach-build) draws its Main
// exercises from the catalog. The designated warm-up clip («חימום», catalog
// muscle: core) used to be an ordinary candidate, so a core-focused program
// prescribed "חימום · 3 סטים · 8-12 חזרות" inside the Main block, next to the
// real warm-up drill of the day. The day's warm-up / cool-down drill could
// likewise be picked again as a Main exercise (shoulders: arm_circles twice).
// The prompt engine (session-builder findWarmup) already keeps the clip out.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const TH = require('../js/core.js');

const REAL_CATALOG = require(path.join('..', 'js', 'catalog.json'));

function entry(id, he, muscles) {
  return { id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner', file: he + '.mp4', source: 'local' };
}

function program(muscle, goal, level, equipment, days) {
  return TH.generateWorkoutProgram({
    age: 31, gender: 'other', fitnessLevel: level, goals: [goal],
    availableEquipment: [equipment],
    targetMuscles: muscle === 'full' ? [] : [muscle],
    injuries: [], previousWorkouts: 8, audience: '', preferCatalog: true
  }, 1, days);
}

function mainNames(day) {
  return (day.exercises || []).map(function (x) { return x.name; });
}

function mainHe(day, meta) {
  return TH.toPhasesWorkout(day, meta || {}).phases[1].exercises.map(function (x) { return x.name; });
}

test('real catalog: a core program never prescribes the warm-up clip in the Main block', function () {
  TH.setCatalog(REAL_CATALOG);
  assert.ok(TH.catalog.warmup, 'the real catalog has the designated warm-up clip');
  const p = program('core', 'general_fitness', 'beginner', 'dumbbells', 5);
  assert.equal(p.dailyWorkouts.length, 5);
  p.dailyWorkouts.forEach(function (day) {
    assert.equal(mainNames(day).indexOf('warmup'), -1, 'day ' + day.day + ' main ids: ' + mainNames(day).join(', '));
    assert.equal(mainHe(day).indexOf('חימום'), -1, 'day ' + day.day + ' main names: ' + mainHe(day).join(', '));
    assert.ok(mainNames(day).length >= 3, 'day ' + day.day + ' still has a full main block');
  });
});

test('real catalog: the day\'s warm-up drill is not repeated as a Main exercise', function () {
  TH.setCatalog(REAL_CATALOG);
  const p = program('shoulders', 'muscle_gain', 'intermediate', 'none', 4);
  p.dailyWorkouts.forEach(function (day) {
    const names = mainNames(day);
    assert.equal(names.indexOf(day.warmUp), -1, 'day ' + day.day + ': ' + day.warmUp + ' is both warm-up and main');
    assert.equal(names.indexOf(day.coolDown), -1, 'day ' + day.day + ': ' + day.coolDown + ' is both cool-down and main');
    const phases = TH.toPhasesWorkout(day, {}).phases;
    const warmHe = phases[0].exercises.map(function (x) { return x.name; });
    const mainList = phases[1].exercises.map(function (x) { return x.name; });
    warmHe.forEach(function (he) {
      assert.equal(mainList.indexOf(he), -1, 'day ' + day.day + ': «' + he + '» shown twice');
    });
  });
});

test('a tiny library: only the real core clips reach Main, the warm-up clip does not', function () {
  const lib = {
    warmup: entry('warmup', 'חימום', ['core']),
    plank: entry('plank', 'פלאנק', ['core']),
    mountain_climber: entry('mountain_climber', 'מטפס הרים', ['core']),
    crunches: entry('crunches', 'כפיפות בטן', ['core'])
  };
  TH.setCatalog(lib);
  const p = program('core', 'hypertrophy', 'beginner', 'none', 3);
  p.dailyWorkouts.forEach(function (day) {
    const names = mainNames(day);
    assert.ok(names.length >= 3, 'day ' + day.day + ' has ' + names.length + ' exercises');
    assert.equal(names.indexOf('warmup'), -1, 'day ' + day.day + ': ' + names.join(', '));
  });
});

test('a warm-up clip stored under another id is recognised by its Hebrew name', function () {
  const lib = {
    drive_warm: entry('drive_warm', 'חימום', ['core']),
    plank: entry('plank', 'פלאנק', ['core']),
    crunches: entry('crunches', 'כפיפות בטן', ['core'])
  };
  TH.setCatalog(lib);
  const p = program('core', 'hypertrophy', 'beginner', 'none', 1);
  const names = mainNames(p.dailyWorkouts[0]);
  assert.equal(names.indexOf('drive_warm'), -1, names.join(', '));
  assert.equal(mainHe(p.dailyWorkouts[0]).indexOf('חימום'), -1);
});
