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

function warmNames(r) {
  return r.workout.phases[0].exercises.map(function (x) { return x.name; });
}

test('a site with no stairs gets no «ריצה קלה במדרגות» in the warm-up', function () {
  ['summer', 'winter'].forEach(function (season) {
    ['narrow', 'medium', 'wide'].forEach(function (width) {
      const r = Plan.build({ width: width, features: ['bench'] }, { group: 4, season: season });
      const names = warmNames(r);
      assert.ok(!names.some(function (n) { return /מדרגות/.test(n); }), width + '/' + season + ': ' + names.join(' | '));
      assert.ok(!names.some(function (n) { return /דלגית/.test(n); }), width + '/' + season + ': ' + names.join(' | '));
    });
  });
});

test('the warm-up keeps its length and drill count without the stairs drill', function () {
  const r = Plan.build({ width: 'medium' }, { group: 4 });
  const warm = r.workout.phases[0];
  const secs = warm.exercises.reduce(function (a, x) { return a + x.duration_seconds; }, 0);
  assert.equal(warm.exercises.length, warm.duration_minutes);
  assert.equal(secs, warm.duration_minutes * 60);
});

test('the booklet page, with no gear given, still draws on the whole bank', function () {
  const w = B.methodWorkout('combined', 0, { season: 'summer', activity: 'long' });
  assert.ok(w.phases[0].exercises.some(function (x) { return /מדרגות/.test(x.name); }));
});
