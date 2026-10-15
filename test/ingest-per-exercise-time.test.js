'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

function rows(text) {
  return THIngest.ingestText(text, []).exercises.map((e) => [e.name, e.reps, e.duration_seconds, e.rest_seconds]);
}

test('«30 שניות לכל תרגיל:» gives every exercise 30 s of work (was 10 invented reps each)', () => {
  assert.deepEqual(rows('30 שניות לכל תרגיל:\nסופרמן\nפלאנק'), [['סופרמן', null, 30, null], ['פלאנק', null, 30, null]]);
  assert.deepEqual(rows('30 שניות לכל תרגיל: סופרמן, פלאנק'), [['סופרמן', null, 30, null], ['פלאנק', null, 30, null]]);
});

test('«40 שניות כל תרגיל» / «כל תרגיל 45 שניות» on their own line are not an exercise «כל תרגיל»', () => {
  assert.deepEqual(rows('40 שניות כל תרגיל\nסופרמן\nפלאנק'), [['סופרמן', null, 40, null], ['פלאנק', null, 40, null]]);
  assert.deepEqual(rows('כל תרגיל 45 שניות\nסופרמן\nפלאנק'), [['סופרמן', null, 45, null], ['פלאנק', null, 45, null]]);
  assert.deepEqual(rows('דקה על כל תרגיל\nסופרמן'), [['סופרמן', null, 60, null]]);
});

test('with rounds and a rest the per-exercise time still holds', () => {
  const r = THIngest.ingestText('3 סבבים, 30 שניות לכל תרגיל:\nסופרמן\nפלאנק', []);
  assert.deepEqual(r.exercises.map((e) => [e.name, e.sets, e.duration_seconds]), [['סופרמן', 3, 30], ['פלאנק', 3, 30]]);
  assert.deepEqual(rows('30 שניות לכל תרגיל, 15 שניות מנוחה\nסופרמן'), [['סופרמן', null, 30, 15]]);
});

test('a rest «לכל תרגיל» / «אחרי כל תרגיל» is the rest, not work time and not an exercise', () => {
  assert.deepEqual(rows('מנוחה 30 שניות לכל תרגיל\nסופרמן 12\nפלאנק 40 שניות'), [['סופרמן', 12, null, 30], ['פלאנק', null, 40, 30]]);
  assert.deepEqual(rows('סופרמן 12, מנוחה 20 אחרי כל תרגיל, פלאנק 30 שניות'), [['סופרמן', 12, null, 20], ['פלאנק', null, 30, 20]]);
});

test('«לכל צד» on an exercise stays a cue on that exercise', () => {
  const r = THIngest.ingestText('פלאנק 30 שניות לכל צד\nסופרמן 12', []);
  assert.equal(r.defaults.workSeconds, null);
  assert.deepEqual(r.exercises.map((e) => [e.name, e.reps, e.duration_seconds]), [['פלאנק', null, 30], ['סופרמן', 12, null]]);
});
