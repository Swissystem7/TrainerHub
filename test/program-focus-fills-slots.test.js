'use strict';

// weekly.html promises «N תרגילים באימון» (4 beginner / 5 intermediate / 6 advanced).
// A focused program («גב», «חזה», «כתפיים») used to stop when the requested muscle
// ran out of drills: a bodyweight back day had 2 exercises for 4 slots, shoulders 3,
// because pickExercises only fell back to another muscle when the day had none at all,
// and then added a single drill. Now the requested muscle fills first, then the
// muscles that share its split (back → biceps, chest → shoulders/triceps, core → legs),
// and stops there, so a «גב» program never turns into squats.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const TH = require('../js/core.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
const WANT = { beginner: 4, intermediate: 5, advanced: 6 };

function profile(overrides) {
  return Object.assign({
    age: 31, gender: 'other', fitnessLevel: 'beginner', goals: ['general_fitness'],
    availableEquipment: ['none'], targetMuscles: ['back'], injuries: [],
    previousWorkouts: 8, audience: '', preferCatalog: true
  }, overrides || {});
}

function ids(day) {
  return day.exercises.map(function (x) { return x.name; });
}

test('real catalog: every focused weekly.html combo carries the number of exercises its level promises', function () {
  TH.setCatalog(catalog);
  const short = [];
  for (const muscle of ['legs', 'chest', 'back', 'shoulders', 'core']) {
    for (const eq of ['none', 'dumbbells', 'band', 'cones', 'ball']) {
      for (const audience of ['', 'kids', 'sport']) {
        for (const level of ['beginner', 'intermediate', 'advanced']) {
          const p = TH.generateWorkoutProgram(profile({
            targetMuscles: [muscle], availableEquipment: [eq], audience: audience, fitnessLevel: level
          }), 1, 3);
          p.dailyWorkouts.forEach(function (day) {
            if (day.exercises.length !== WANT[level]) {
              short.push([muscle, eq, audience || 'general', level, 'day' + day.day, ids(day).join(',')].join(' '));
            }
            assert.equal(new Set(ids(day)).size, day.exercises.length, 'duplicate exercise in ' + ids(day).join(','));
            assert.ok(ids(day).indexOf(day.warmUp) === -1 && ids(day).indexOf(day.coolDown) === -1,
              'warm-up / cool-down drill in Main: ' + ids(day).join(','));
          });
        }
      }
    }
  }
  assert.deepEqual(short, [], 'short days:\n' + short.join('\n'));
});

test('real catalog: a bodyweight back day keeps its back drills first and fills the rest (was 2 of 4)', function () {
  TH.setCatalog(catalog);
  const p = TH.generateWorkoutProgram(profile(), 1, 1);
  const day = p.dailyWorkouts[0];
  assert.equal(day.exercises.length, 4);
  // The two back drills the old code stopped at are still the first two.
  assert.equal(day.exercises[0].name, 'superman');
  const first = ids(day).slice(0, 2);
  first.forEach(function (id) {
    const entry = catalog[id] || { muscles: ['back'] };
    assert.ok(entry.muscles.indexOf('back') !== -1, id + ' is not a back drill');
  });
  // The fill-ins never bring the bar clip into a «משקל גוף» program.
  assert.ok(ids(day).indexOf('bodyweight_row') === -1, ids(day).join(','));
});

test('built-in pool: a chest day fills from the push split (shoulders / triceps) before anything else', function () {
  TH.setCatalog({});
  const p = TH.generateWorkoutProgram(profile({
    targetMuscles: ['chest'], fitnessLevel: 'intermediate', goals: ['hypertrophy']
  }), 1, 1);
  const day = p.dailyWorkouts[0];
  assert.equal(day.exercises.length, 5);
  assert.deepEqual(ids(day).slice(0, 2).sort(), ['push_up', 'wide_push_up']);
  const PUSH = ['pike_push_up', 'arm_circles', 'bench_dips', 'tricep_push_up'];
  ids(day).slice(2).forEach(function (id) {
    assert.ok(PUSH.indexOf(id) !== -1, id + ' is not a push-split fill-in');
  });
});

test('built-in pool: a bodyweight back day fills with biceps (pull) and stops there, never with legs', function () {
  TH.setCatalog({});
  const p = TH.generateWorkoutProgram(profile({ fitnessLevel: 'advanced' }), 1, 1);
  const names = ids(p.dailyWorkouts[0]);
  // Only three bodyweight pull drills exist in the built-in pool: the day stays honest
  // at three rather than borrowing squats for a «גב» program.
  assert.deepEqual(names.slice(0, 2).sort(), ['bodyweight_row', 'superman']);
  assert.deepEqual(names.slice(2), ['bodyweight_curl']);
});

test('built-in pool: a split day that already has enough drills is unchanged', function () {
  TH.setCatalog({});
  const p = TH.generateWorkoutProgram(profile({ targetMuscles: [], availableEquipment: ['dumbbells'] }), 1, 3);
  // push / pull / legs: every exercise still belongs to the day's split.
  const SPLIT = { push: ['chest', 'shoulders', 'triceps'], pull: ['back', 'biceps'], legs: ['legs'] };
  const MUSCLES = {
    push_up: 'chest', wide_push_up: 'chest', dumbbell_bench: 'chest', dumbbell_fly: 'chest',
    pike_push_up: 'shoulders', arm_circles: 'shoulders', dumbbell_ohp: 'shoulders', lateral_raise: 'shoulders',
    bench_dips: 'triceps', tricep_push_up: 'triceps', overhead_extension: 'triceps',
    superman: 'back', bodyweight_row: 'back', dumbbell_row: 'back',
    bodyweight_curl: 'biceps', bicep_curl: 'biceps', hammer_curl: 'biceps',
    bodyweight_squat: 'legs', lunges: 'legs', glute_bridge: 'legs', step_up: 'legs', wall_sit: 'legs',
    calf_raise: 'legs', goblet_squat: 'legs', dumbbell_lunge: 'legs', romanian_deadlift_db: 'legs'
  };
  p.dailyWorkouts.forEach(function (day) {
    assert.equal(day.exercises.length, 4, day.split + ': ' + ids(day).join(','));
    ids(day).forEach(function (id) {
      assert.ok(SPLIT[day.split].indexOf(MUSCLES[id]) !== -1, id + ' on ' + day.split);
    });
  });
});
