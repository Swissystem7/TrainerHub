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

function rests(text) {
  return Ingest.ingestText(text).workout.phases[1].exercises.map(function (e) { return e.rest_seconds; });
}

test('a rest line in minutes rests every exercise, as «מנוחה 2 דקות» does', function () {
  assert.deepEqual(rests('מתח 5x5\nמקבילים 5x5\nמנוחה 3 דקות'), [180, 180]);
  assert.deepEqual(rests('מתח 5x5\nמקבילים 5x5\nמנוחה 2 דקות'), [120, 120]);
  assert.deepEqual(rests('מתח 5x5\nמקבילים 5x5\nמנוחה דקה וחצי'), [90, 90]);
  assert.deepEqual(rests('מתח 5x5\nמקבילים 5x5\nמנוחה: 2.5 דקות'), [150, 150]);
  assert.deepEqual(rests('מתח 5x5\nמקבילים 5x5\n4 דקות מנוחה'), [240, 240]);
});

test('the count of «3x12 דקה מנוחה» is not the minutes', function () {
  assert.deepEqual(rests('סקוואט 3x12 דקה מנוחה\nלאנג׳ 3x10'), [60, 60]);
});

test('a second rest line still sets only its own exercise', function () {
  assert.deepEqual(rests('מתח 5x5\nמנוחה 3 דקות\nמקבילים 5x5\nמנוחה 30 שניות'), [180, 30]);
});
