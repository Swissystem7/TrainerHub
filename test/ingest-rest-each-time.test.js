'use strict';

// «מנוחה 30 שניות כל פעם» is the rest after every set, as «אחרי כל סט» is. The «כל פעם» was left
// on the line as a phantom exercise «כל פעם» of 10 invented reps, and inline it rode into the name
// («סקוואט 3x12 מנוחה 30 שניות כל פעם» was «סקוואט כל פעם»).

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
    return { name: e.name, sets: e.sets, reps: e.reps, rest: e.rest_seconds };
  });
}

test('a rest line ending in «כל פעם» rests the exercises and adds no phantom', function () {
  const two = [{ name: 'סקוואט', sets: 3, reps: 12, rest: 30 }, { name: 'לאנג׳', sets: 3, reps: 10, rest: 30 }];
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה 30 שניות כל פעם'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה 30 שניות בכל פעם'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה של 30 שניות אחרי כל פעם'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\n30 שניות מנוחה כל פעם'), two);
  assert.deepEqual(rows('סקוואט 3x12\nלאנג׳ 3x10\nמנוחה דקה כל פעם').map(function (r) { return r.rest; }), [60, 60]);
});

test('a «מנוחה … כל פעם» between exercises does not become an exercise', function () {
  const out = rows('סקוואט 3x12\nמנוחה 30 שניות כל פעם\nלאנג׳ 3x10');
  assert.deepEqual(out.map(function (r) { return r.name; }), ['סקוואט', 'לאנג׳']);
});

test('inline «מנוחה 30 שניות כל פעם» keeps the exercise name clean', function () {
  assert.deepEqual(rows('סקוואט 3x12 מנוחה 30 שניות כל פעם'), [{ name: 'סקוואט', sets: 3, reps: 12, rest: 30 }]);
});
