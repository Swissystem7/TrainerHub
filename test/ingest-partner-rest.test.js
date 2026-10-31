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

test('«מנוחה בזמן שבן הזוג עובד» is the IGO-UGO rest, not an exercise «בזמן שבן הזוג עובד»', () => {
  // The partner clause was a clip-less exercise of 10 invented reps; it rests like «מנוחה לפי הצורך».
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה בזמן שבן הזוג עובד'), [['סקוואט', 3, 12, null, 60]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה כשהזוג עובד'), [['סקוואט', 3, 12, null, 60]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה בזמן שהשותף מתאמן'), [['סקוואט', 3, 12, null, 60]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 מנוחה בזמן שבת הזוג עובדת'), [['סקוואט', 3, 12, null, null]]);
});

test('a round header ending «מנוחה בזמן שבן הזוג עובד» keeps only its exercises', () => {
  // The ready-made IGO-UGO workouts end this way; the round grew a fifth «exercise».
  const names = rows('4 סבבים: 10 שכיבות סמיכה, 15 סקוואטים, 20 שניות אדמה בוערת, מנוחה בזמן שבן הזוג עובד').map((r) => r[0]);
  assert.deepStrictEqual(names, ['שכיבות סמיכה', 'סקוואטים', 'אדמה בוערת']);
});
