const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('«חזרה אחת» is one rep, not part of the name with an invented 10', () => {
  assert.deepStrictEqual(rows('סקוואט 5 סטים של חזרה אחת'), [['סקוואט', 5, 1, null]]);
  assert.deepStrictEqual(rows('מתח חזרה אחת'), [['מתח', 1, 1, null]]);
});

test('«סט אחד» and «סבב אחד» are one set', () => {
  assert.deepStrictEqual(rows('מתח סט אחד של 8'), [['מתח', 1, 8, null]]);
  assert.deepStrictEqual(rows('ריצה סבב אחד'), [['ריצה', 1, 10, null]]);
});

test('«אחת» after other words stays in the name', () => {
  assert.deepStrictEqual(rows('סקוואט על רגל אחת 3x8'), [['סקוואט על רגל אחת', 3, 8, null]]);
});
