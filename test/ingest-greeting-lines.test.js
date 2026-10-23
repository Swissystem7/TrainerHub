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
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

const TWO = [['סקוואט', 3, 12, null], ['מתח', 3, 8, null]];

test('a greeting that names who it is for is not an exercise', () => {
  // Each was an exercise of 10 invented reps named after the greeting.
  assert.deepStrictEqual(rows('בוקר טוב לכולם\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('שבוע טוב לכולם!\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('ערב טוב חברים\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('היי לכולם\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('צהריים טובים\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nשבת שלום לכולם'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nחג שמח לכולם'), TWO);
  assert.deepStrictEqual(Ingest.ingestText('בוקר טוב לכולם\nסקוואט 3x12\nמתח 3x8').unmatched, ['סקוואט', 'מתח']);
});

test('the bare greetings still drop, and a greeting with a count stays an exercise line', () => {
  assert.deepStrictEqual(rows('בוקר טוב\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nשבוע טוב'), TWO);
  assert.equal(rows('בוקר טוב 10 ברפי').length, 1);
});
