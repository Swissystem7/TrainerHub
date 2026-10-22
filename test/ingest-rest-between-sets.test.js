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
  return Ingest.ingestText(text).workout.phases[1].exercises.map(function (e) {
    return { name: e.name, rest: e.rest_seconds };
  });
}

test('a trailing «מנוחה בין הסטים 45 שניות» rests every exercise, as «מנוחה 45 שניות בין הסטים» does', function () {
  const two = [{ name: 'סקוואט', rest: 45 }, { name: 'לאנג׳', rest: 45 }];
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין הסטים 45 שניות'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין הסטים: 45 שניות'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין הסטים: 45'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nהפסקה בין סטים 45 שניות'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה 45 שניות בין הסטים'), two);
});

test('minutes and a clock after «בין הסטים» are the rest of every exercise too', function () {
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין הסטים דקה וחצי'), [{ name: 'סקוואט', rest: 90 }, { name: 'לאנג׳', rest: 90 }]);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין התרגילים 2 דקות'), [{ name: 'סקוואט', rest: 120 }, { name: 'לאנג׳', rest: 120 }]);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין הסטים: 1:30'), [{ name: 'סקוואט', rest: 90 }, { name: 'לאנג׳', rest: 90 }]);
});

test('«בין סט לסט» and a leading «בין הסטים» are part of the rest, not an exercise', function () {
  assert.deepEqual(rows('סקוואט 3x12\nמנוחה 30 שניות בין סט לסט\nלאנג׳ 3x10'), [{ name: 'סקוואט', rest: 30 }, { name: 'לאנג׳', rest: 30 }]);
  assert.deepEqual(rows('סקוואט 3x12 מנוחה 30 שניות בין סט לסט'), [{ name: 'סקוואט', rest: 30 }]);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה בין סט לסט - 45 שנ׳'), [{ name: 'סקוואט', rest: 45 }, { name: 'לאנג׳', rest: 45 }]);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nבין הסטים מנוחה 45 שניות'), [{ name: 'סקוואט', rest: 45 }, { name: 'לאנג׳', rest: 45 }]);
  assert.deepEqual(rows('סקוואט 3x12 מנוחה בין כל סבב 45 שניות\nלאנג׳ 3x10'), [{ name: 'סקוואט', rest: 45 }, { name: 'לאנג׳', rest: 45 }]);
  assert.equal(Ingest.isRestToken('מנוחה 30 שניות בין סט לסט'), true);
  assert.equal(Ingest.isRestToken('בין הסטים מנוחה 45 שניות'), true);
});

test('a rest line of its own still sets only its exercise, and «מנוחה» on one line does not borrow the next', function () {
  assert.deepEqual(rows('מתח 5x5\nמנוחה 3 דקות\nמקבילים 5x5\nמנוחה 30 שניות'), [{ name: 'מתח', rest: 180 }, { name: 'מקבילים', rest: 30 }]);
  assert.deepEqual(rows('פלאנק 40 שניות מנוחה של דקה בין הסטים'), [{ name: 'פלאנק', rest: 60 }]);
  assert.deepEqual(Ingest.ingestText('סקוואט 3x12\nמנוחה בין הסטים\n45 שניות עבודה').workout.phases[1].exercises.map(function (e) { return [e.duration_seconds, e.rest_seconds]; }), [[45, 60]]);
});
