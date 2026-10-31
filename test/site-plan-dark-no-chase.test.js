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

function allNames(r) {
  return r.workout.phases.reduce(function (a, ph) { return a.concat(ph.exercises.map(function (x) { return x.name; })); }, []);
}

test('wide site in dim light: no tag game and no relay race, and the reasons say why', function () {
  const tag = B.games('tag')[0];
  const r = Plan.build({ width: 'wide', hazards: ['dark'] }, { group: 12 });
  assert.notEqual(r.method, 'opening-1');
  assert.ok(!allNames(r).some(function (n) { return /שליחים/.test(n); }), allNames(r).join(' | '));
  if (tag) assert.ok(!allNames(r).includes(tag.he), 'no ' + tag.he);
  assert.ok(r.reasons[0].includes('כי התאורה חלשה'), r.reasons[0]);
  assert.ok(r.reasons.includes('לא שילבתי משחקי תופסת או שליחים כי התאורה חלשה'), r.reasons.join(' | '));
  assert.ok(r.warnings.some(function (w) { return /^תאורה חלשה/.test(w); }));
});

test('the floor reason still wins when the floor is unsafe in the dark too', function () {
  const r = Plan.build({ width: 'wide', hazards: ['dark', 'slippery'] }, { group: 12 });
  assert.ok(r.reasons[0].includes('כי המשטח לא בטוח לריצה'), r.reasons[0]);
});

test('a lit wide site still opens with the tag game', function () {
  const tag = B.games('tag')[0];
  const r = Plan.build({ width: 'wide', hazards: [] }, { group: 12 });
  assert.equal(r.method, 'opening-1');
  if (tag) assert.ok(allNames(r).includes(tag.he));
});
