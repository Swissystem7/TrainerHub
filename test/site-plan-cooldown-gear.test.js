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

const gearOf = {};
B.drills({ category: 'flexibility' }).forEach(function (d) { gearOf[d.he] = d.equipment || []; });
const cooldown = function (r) { return r.workout.phases[r.workout.phases.length - 1]; };

test('bare site: no cool-down stretch needs a step, a bar or a towel', function () {
  ['narrow', 'medium', 'wide'].forEach(function (width) {
    const cool = cooldown(Plan.build({ width: width }, { group: 3 }));
    assert.equal(cool.name, 'Cool-down');
    assert.ok(cool.exercises.length >= 3, width + ': still a cool-down');
    cool.exercises.forEach(function (x) {
      assert.deepEqual(gearOf[x.name], ['none'], width + ': ' + x.name);
    });
  });
});

test('stairs and playground: the step and bar stretches stay', function () {
  const names = cooldown(Plan.build({ width: 'medium', features: ['stairs', 'playground'] }, { group: 3 })).exercises
    .map(function (x) { return x.name; });
  assert.ok(names.some(function (n) { return gearOf[n].indexOf('step') !== -1; }), 'a step stretch');
  assert.ok(names.some(function (n) { return gearOf[n].indexOf('pullup_bar') !== -1; }), 'a bar stretch');
});

test('a bench is the raised surface too', function () {
  const names = cooldown(Plan.build({ width: 'medium', features: ['bench'] }, { group: 3 })).exercises
    .map(function (x) { return x.name; });
  assert.ok(names.some(function (n) { return gearOf[n].indexOf('step') !== -1; }));
  assert.ok(!names.some(function (n) { return gearOf[n].indexOf('pullup_bar') !== -1; }));
});
