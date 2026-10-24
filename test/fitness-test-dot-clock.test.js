'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
B.setData(read(B.MAIN_PATH), read(B.TEAM_PATH));

test('a run time typed with a dot or comma («13.30») scores as 13:30, not 13.3 seconds', function () {
  assert.equal(B.scoreComponent('run3k', '13.31', 'male'), B.scoreComponent('run3k', '13:31', 'male'));
  assert.equal(B.scoreComponent('run3k', '13.31', 'male'), 70);
  assert.equal(B.scoreComponent('run3k', '13,31', 'male'), 70);
  assert.equal(B.scoreComponent('run3k', '18.00', 'female'), B.scoreComponent('run3k', '18:00', 'female'));
  assert.equal(B.scoreComponent('run300', '0.55', 'male'), 70);
  assert.equal(B.scoreComponent('plank', '2.00'), B.scoreComponent('plank', '2:00'));
  const r = B.scoreFitnessTest({ pullups: 12, pushups: 30, plank: '2.00', run300: '0.55', run3k: '13.31' }, 'male');
  const c = B.scoreFitnessTest({ pullups: 12, pushups: 30, plank: '2:00', run300: '0:55', run3k: '13:31' }, 'male');
  assert.equal(r.total, c.total);
});

test('a decimal that is a plausible time in seconds stays seconds', function () {
  assert.equal(B.scoreComponent('run300', '55.40', 'male'), B.scoreComponent('run300', 55.4, 'male'));
  assert.equal(B.scoreComponent('run300', '55.4', 'male'), B.scoreComponent('run300', 55.4, 'male'));
  assert.equal(B.scoreComponent('plank', '45.50'), B.scoreComponent('plank', 45.5));
  assert.equal(B.scoreComponent('run3k', '810', 'male'), B.scoreComponent('run3k', '13:30', 'male'));
});
