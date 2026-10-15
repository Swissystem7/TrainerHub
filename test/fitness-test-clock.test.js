'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
B.setData(read(B.MAIN_PATH), read(B.TEAM_PATH));

test('a stopwatch h:mm:ss time reads as hours, minutes and seconds', function () {
  assert.equal(B.parseClock('00:12:30'), 750);
  assert.equal(B.parseClock('0:13:31'), 811);
  assert.equal(B.parseClock('12:30'), 750);
  assert.equal(B.scoreComponent('run3k', '00:13:31', 'male'), B.scoreComponent('run3k', '13:31', 'male'));
  assert.equal(B.scoreComponent('run3k', '00:13:31', 'male'), 70);
});

test('a clock part of 60 or more, an empty part or four parts is not a time', function () {
  for (const v of ['12:75', '1:60:00', ':30', '1:', '1:2:3:4', '1:a']) {
    assert.ok(Number.isNaN(B.parseClock(v)), v);
  }
  assert.equal(B.scoreComponent('run3k', '12:75', 'male'), null);
  assert.equal(B.scoreComponent('plank', '1:75'), null);
});

test('a zero run time is no result, not the top score', function () {
  for (const v of ['0', '0:00', '00:00:00', 0]) {
    assert.equal(B.scoreComponent('run3k', v, 'male'), null, String(v));
    assert.equal(B.scoreComponent('run300', v, 'female'), null, String(v));
  }
  const r = B.scoreFitnessTest({ pullups: 12, pushups: 30, plank: '2:00', run300: '0:55', run3k: '0:00' }, 'male');
  assert.equal(r.complete, false);
  assert.equal(B.scoreComponent('pullups', 0), 0, 'zero reps still scores zero');
});
