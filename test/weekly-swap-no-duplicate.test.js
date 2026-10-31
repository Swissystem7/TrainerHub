'use strict';

// weekly.html «החלף…» offered exercises that were already in the same day, so
// picking one played the same exercise twice. substitutesFor now takes
// opts.exclude (the day's other steps) and leaves those out.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const TH = require('../js/core.js');

const REAL_CATALOG = require(path.join('..', 'js', 'catalog.json'));

test('weekly swap alternatives skip exercises already in the day', function () {
  TH.setCatalog(REAL_CATALOG);
  let checked = 0;
  ['none', 'dumbbells', 'bands'].forEach(function (eq) {
    ['full', 'legs', 'core', 'chest'].forEach(function (muscle) {
      const p = TH.generateWorkoutProgram({
        age: 31, gender: 'other', fitnessLevel: 'beginner', goals: ['general_fitness'],
        availableEquipment: [eq], targetMuscles: muscle === 'full' ? [] : [muscle],
        injuries: [], previousWorkouts: 8, preferCatalog: true
      }, 1, 3);
      p.dailyWorkouts.forEach(function (d) {
        const w = TH.toPhasesWorkout(d, {});
        const all = (w.phases || []).flatMap(ph => ph.exercises || []);
        const ids = all.map(x => (TH.findExercise ? (TH.findExercise(x) || {}).id : null) || x.id || x.name);
        all.forEach(function (x) {
          TH.substitutesFor(x, { equipment: [eq], limit: 3, exclude: all }).forEach(function (a) {
            checked++;
            assert.ok(ids.indexOf(a.id) === -1 && all.every(y => y.name !== a.he),
              a.he + ' is already in day ' + d.day + ' (' + eq + '/' + muscle + ')');
          });
        });
      });
    });
  });
  assert.ok(checked > 0);
});

test('without exclude the old behaviour is unchanged', function () {
  TH.setCatalog(REAL_CATALOG);
  const a = TH.substitutesFor({ id: 'push_up' }, { limit: 3 });
  const b = TH.substitutesFor({ id: 'push_up' }, { limit: 3, exclude: [] });
  assert.deepEqual(a.map(x => x.id), b.map(x => x.id));
});
