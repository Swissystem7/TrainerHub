const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds, e.notes]));
}

test('a comma decimal before minutes is a decimal point', () => {
  // Was a rest of 1 s.
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה 1,5 דקות')[0].slice(0, 5), ['סקוואט', 3, 10, null, 90]);
  // Was a name «סקוואט 2» with 300 s rest.
  assert.deepStrictEqual(rows('סקוואט 3x10 2,5 דקות מנוחה')[0].slice(0, 5), ['סקוואט', 3, 10, null, 150]);
  // Was 1 rep with no time.
  assert.deepStrictEqual(rows('פלאנק 1,5 דקות')[0].slice(0, 5), ['פלאנק', 1, null, 90, null]);
  assert.deepStrictEqual(rows('פלאנק 1,5 דק׳')[0].slice(0, 5), ['פלאנק', 1, null, 90, null]);
});

test('a comma-decimal rest line sets the rest and is not an exercise', () => {
  // Was an exercise «בין סטים» and 1 s rest.
  const out = rows('מנוחה 1,5 דקות בין סטים\nסקוואט 3x10');
  assert.strictEqual(out.length, 1);
  assert.deepStrictEqual(out[0].slice(0, 5), ['סקוואט', 3, 10, null, 90]);
});

test('a comma-decimal load goes to the notes', () => {
  // Was a name «לחיצת חזה 12».
  const [press] = rows('לחיצת חזה 4x8 12,5 קג');
  assert.deepStrictEqual(press.slice(0, 3), ['לחיצת חזה', 4, 8]);
  assert.match(press[5], /12\.5 ק"ג/);
});

test('a comma between counts or exercises still separates them', () => {
  assert.deepStrictEqual(rows('סקוואט 10,לאנג׳ 12').map((r) => r.slice(0, 3)), [['סקוואט', 1, 10], ['לאנג׳', 1, 12]]);
  assert.deepStrictEqual(rows('סקוואט 12,10,8')[0].slice(0, 3), ['סקוואט', 1, 12]);
});
