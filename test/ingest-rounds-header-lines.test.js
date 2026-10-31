'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]));
}

test('the lines above «3 סבבים:» are kept, once each, not dropped', () => {
  // Was only סקוואט and שכיבות סמיכה: everything above the rounds header went with its title.
  assert.deepStrictEqual(rows('ריצה קלה 5 דקות\nמתיחות 2 דקות\n3 סבבים:\nסקוואט 15\nשכיבות סמיכה 10'), [
    ['ריצה קלה', 1, null, 300, null],
    ['מתיחות', 1, null, 120, null],
    ['סקוואט', 3, 15, null, null],
    ['שכיבות סמיכה', 3, 10, null, null]
  ]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות\n3 סבבים - סקוואט 15, ברפי 10'), [
    ['פלאנק', 1, null, 30, null],
    ['סקוואט', 3, 15, null, null],
    ['ברפי', 3, 10, null, null]
  ]);
  assert.deepStrictEqual(rows('ברפי 10\n3 סבבים\nסקוואט 15\nלאנג׳ 10'), [
    ['ברפי', 1, 10, null, null],
    ['סקוואט', 3, 15, null, null],
    ['לאנג׳', 3, 10, null, null]
  ]);
});

test('a title above or on the rounds header is still not an exercise', () => {
  assert.deepStrictEqual(rows('אימון רגליים\n3 סבבים:\nסקוואט 15\nלאנג׳ 10'), [['סקוואט', 3, 15, null, null], ['לאנג׳', 3, 10, null, null]]);
  assert.deepStrictEqual(rows('אימון רגליים 3 סבבים: סקוואט 15, לאנג׳ 10'), [['סקוואט', 3, 15, null, null], ['לאנג׳', 3, 10, null, null]]);
});

test('«מנוחה בין סבבים: 60 שניות» is the rest, not a rounds header that drops the paste', () => {
  // Was an empty workout: the rest line was read as a header with nothing but «60 שניות» under it.
  assert.deepStrictEqual(rows('סקוואט 15\nלאנג׳ 10\nמנוחה בין סבבים: 60 שניות'), [['סקוואט', 1, 15, null, 60], ['לאנג׳', 1, 10, null, 60]]);
  assert.deepStrictEqual(rows('סקוואט 15\nלאנג׳ 10\nמנוחה בין הסבבים - דקה'), [['סקוואט', 1, 15, null, 60], ['לאנג׳', 1, 10, null, 60]]);
});

test('«סקוואט 3 סבבים - 15 חזרות» is one exercise, not a header over the next line', () => {
  // Was only לאנג׳: the dash after «סבבים» made the first line a header and dropped סקוואט.
  assert.deepStrictEqual(rows('סקוואט 3 סבבים - 15 חזרות\nלאנג׳ 3 סבבים - 10 חזרות'), [['סקוואט', 3, 15, null, null], ['לאנג׳', 3, 10, null, null]]);
});
