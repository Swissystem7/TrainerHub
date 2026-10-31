'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');
const Plan = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
B.setData(read(B.MAIN_PATH), read(B.TEAM_PATH));

function phase(r, name) {
  return r.workout.phases.filter(function (ph) { return ph.name === name; })[0];
}

function sumPhases(r) {
  return r.workout.phases.reduce(function (a, ph) { return a + ph.duration_minutes; }, 0);
}

// stairs 3x40s + 2x45s rest = 210 s; bench step-up 3x12 reps (3 s each) + 2x45 = 198 s; dips 3x10 + 2x45 = 180 s;
// wall sit 3x30 + 2x45 = 180 s; wall push 2x15 + 45 = 135 s; slope 4x20 + 3x45 = 215 s → 1118 s ≈ 19 min.
test('site drills stretch the Main phase minutes and the workout total, not only the exercise list', function () {
  const plain = Plan.build({ width: 'medium' }, { group: 4 });
  const full = Plan.build({ width: 'medium', features: ['stairs', 'bench', 'wall', 'slope'] }, { group: 4 });
  const plainMain = phase(plain, 'Main');
  const fullMain = phase(full, 'Main');
  assert.equal(fullMain.exercises.length, plainMain.exercises.length + 6);
  assert.equal(fullMain.duration_minutes, plainMain.duration_minutes + 19);
  assert.equal(full.workout.duration_minutes, plain.workout.duration_minutes + 19);
  assert.equal(full.workout.duration_minutes, sumPhases(full), 'header total equals the sum of the phases');
  assert.ok(!('added_seconds' in fullMain), 'no bookkeeping field left on the saved workout');
});

test('the 5-minute tag game is counted in the warm-up and in the total', function () {
  const small = Plan.build({ width: 'wide' }, { group: 4 });
  const big = Plan.build({ width: 'wide' }, { group: 12 });
  const game = B.games('tag')[0];
  assert.equal(phase(big, 'Warm-up').exercises[0].name, game.he);
  assert.equal(phase(big, 'Warm-up').duration_minutes, phase(small, 'Warm-up').duration_minutes + 5);
  assert.equal(big.workout.duration_minutes, small.workout.duration_minutes + 5);
  assert.equal(big.workout.duration_minutes, sumPhases(big));
});

test('without site features the booklet minutes are untouched', function () {
  const r = Plan.build({ width: 'narrow' }, { group: 1 });
  const base = B.methodWorkout('tabata', 0, { season: 'summer', activity: 'long' });
  assert.equal(r.workout.duration_minutes, base.duration_minutes);
  assert.deepEqual(r.workout.phases.map(function (ph) { return ph.duration_minutes; }),
    base.phases.map(function (ph) { return ph.duration_minutes; }));
});
