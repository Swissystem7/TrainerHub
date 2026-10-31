'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises.map((e) => [e.name, e.sets, e.reps]);
}

test('a move with a «ו» tail that finishes it is one exercise, not a phantom of 10 invented reps', () => {
  // Texts from js/ready-workouts.json: «גלגול» / «נגיעה» were exercises of 10 reps each.
  assert.deepStrictEqual(rows('10 חזרות ניתור לאדמה וגלגול'), [['ניתור לאדמה וגלגול', 1, 10]]);
  assert.deepStrictEqual(rows('ניתור לאדמה וגלגול 3x8'), [['ניתור לאדמה וגלגול', 3, 8]]);
  assert.deepStrictEqual(rows('3 סבבים: 4 מטר תנועה לפנים ונגיעה, 9 מטר תנועה לאחור ונגיעה, מנוחה 1 דקות').map((r) => r[0]),
    ['תנועה לפנים ונגיעה', 'תנועה לאחור ונגיעה']);
});

test('a «ו» before a counted exercise or a clip still splits', () => {
  assert.deepStrictEqual(rows('סקוואט 10 ומתח 8'), [['סקוואט', 1, 10], ['מתח', 1, 8]]);
  assert.equal(rows('10 שכיבות סמיכה ו12 סקוואט').length, 2);
  assert.equal(rows('10 שכיבות סמיכה ומתח').length, 2);
});
