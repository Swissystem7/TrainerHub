'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
B.setData(read(B.MAIN_PATH), read(B.TEAM_PATH));

test('a reps field holding only a space is empty, not 0 reps', function () {
  assert.equal(B.scoreComponent('pullups', ' '), null);
  assert.equal(B.scoreComponent('pushups', '\t '), null);
  assert.equal(B.scoreComponent('pullups', '0'), 0);
  const r = B.scoreFitnessTest({ pullups: ' ', pushups: 30, plank: '2:00', run300: '0:55', run3k: '13:31' }, 'male');
  assert.equal(r.components[0].score, null);
  assert.equal(r.complete, false);
});
