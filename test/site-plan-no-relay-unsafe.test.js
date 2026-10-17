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

test('wide site on an uneven or slippery floor: no relay race, and the reason says why', function () {
  ['uneven', 'slippery'].forEach(function (h) {
    [3, 12].forEach(function (group) {
      const r = Plan.build({ width: 'wide', hazards: [h] }, { group: group });
      assert.notEqual(r.method, 'opening-1', h + ' / ' + group);
      assert.ok(!allNames(r).some(function (n) { return /שליחים/.test(n); }), 'no relay on ' + h);
      assert.ok(r.reasons[0].includes('כי המשטח לא בטוח לריצה'), r.reasons[0]);
      assert.ok(!r.reasons.some(function (x) { return /מאפשר ריצות/.test(x); }));
    });
  });
});

test('wide site next to cars: no relay race either', function () {
  const r = Plan.build({ width: 'wide', hazards: ['cars'] }, { group: 12 });
  assert.ok(!allNames(r).some(function (n) { return /שליחים/.test(n); }));
  assert.ok(r.reasons[0].includes('כי יש מכוניות ליד השטח'));
  assert.equal(r.layout, 'together', 'the width still sets the layout');
});

test('a safe wide site keeps the opening session with its relay race', function () {
  const r = Plan.build({ width: 'wide', hazards: ['heat'] }, { group: 12 });
  assert.equal(r.method, 'opening-1');
  assert.ok(allNames(r).some(function (n) { return /שליחים/.test(n); }));
});
