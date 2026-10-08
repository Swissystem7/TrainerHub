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

function drill(r, name) {
  const main = r.workout.phases.filter(function (ph) { return ph.name === 'Main'; })[0];
  return main.exercises.filter(function (x) { return x.name === name; })[0];
}

test('uneven floor: slope and stair runs drop to walking pace, bench drills stay as they are', function () {
  const r = Plan.build({ width: 'medium', features: ['slope', 'stairs', 'bench'], hazards: ['uneven'] }, { group: 4 });
  assert.match(drill(r, 'ריצות עלייה בשיפוע').notes, /משטח לא אחיד: בקצב הליכה/);
  assert.match(drill(r, 'עליות מדרגות בריצה קלה').notes, /משטח לא אחיד: בקצב הליכה/);
  assert.equal(drill(r, 'עליות על ספסל').notes, null);
});

test('slippery still wins over uneven, and a clean floor adds no note', function () {
  const both = Plan.build({ width: 'medium', features: ['slope'], hazards: ['uneven', 'slippery'] }, { group: 4 });
  assert.match(drill(both, 'ריצות עלייה בשיפוע').notes, /^משטח חלק/);
  const clean = Plan.build({ width: 'medium', features: ['slope'] }, { group: 4 });
  assert.equal(drill(clean, 'ריצות עלייה בשיפוע').notes, null);
});

test('wide site, big group, no tag game: the reason line says why', function () {
  const cars = Plan.build({ width: 'wide', hazards: ['cars'] }, { group: 12 });
  assert.ok(cars.reasons.includes('לא שילבתי משחקי תופסת או שליחים כי יש מכוניות ליד השטח'));
  const floor = Plan.build({ width: 'wide', hazards: ['uneven'] }, { group: 12 });
  assert.ok(floor.reasons.includes('לא שילבתי משחקי תופסת או שליחים כי המשטח לא בטוח לריצה'));
  const small = Plan.build({ width: 'wide', hazards: ['cars'] }, { group: 3 });
  assert.ok(!small.reasons.some(function (x) { return /לא שילבתי משחקי/.test(x); }), 'small groups get no game line');
});
