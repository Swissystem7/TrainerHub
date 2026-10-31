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

test('slippery floor: every booklet warm-up drill drops to walking pace', function () {
  ['narrow', 'medium', 'wide'].forEach(function (width) {
    const r = Plan.build({ width: width, hazards: ['slippery'] }, { group: 10 });
    const warm = r.workout.phases[0];
    assert.ok(warm.exercises.some(function (x) { return /^ריצה/.test(x.name); }), width + ': warm-up has running drills');
    warm.exercises.forEach(function (x) {
      assert.match(x.notes || '', /משטח חלק: בקצב הליכה, בלי ריצה/, width + ': ' + x.name);
    });
  });
});

test('dry floor: the warm-up keeps its drills as written', function () {
  const r = Plan.build({ width: 'wide' }, { group: 3 });
  r.workout.phases[0].exercises.forEach(function (x) {
    assert.doesNotMatch(x.notes || '', /משטח חלק/, x.name);
  });
});
