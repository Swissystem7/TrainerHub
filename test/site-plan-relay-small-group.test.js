'use strict';

// The opening session opens its Main phase with a 20-minute relay race
// («מחלקים את הצוות לקבוצות שוות»). A wide site picked it for any group, so a
// coach with one to three trainees got a relay race nobody could run.

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

test('wide site with one to three trainees: no relay race, and the reason says why', function () {
  [1, 2, 3].forEach(function (group) {
    const r = Plan.build({ width: 'wide' }, { group: group });
    assert.equal(r.method, 'combined', 'group ' + group);
    assert.ok(!allNames(r).some(function (n) { return /שליחים/.test(n); }), 'no relay for ' + group);
    assert.ok(r.reasons[0].includes('כי אין מספיק מתאמנים לשתי קבוצות שליחים'), r.reasons[0]);
  });
});

test('four trainees on a wide site still get the opening session with its relay race', function () {
  const r = Plan.build({ width: 'wide' }, { group: 4 });
  assert.equal(r.method, 'opening-1');
  assert.ok(allNames(r).some(function (n) { return /שליחים/.test(n); }));
});

test('an unsafe floor still names the floor, not the group size', function () {
  const r = Plan.build({ width: 'wide', hazards: ['slippery'] }, { group: 2 });
  assert.ok(r.reasons[0].includes('כי המשטח לא בטוח לריצה'), r.reasons[0]);
});
