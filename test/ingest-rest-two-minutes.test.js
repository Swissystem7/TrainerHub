const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  const out = [];
  Ingest.ingestText(text).workout.phases.forEach((ph) => {
    ph.exercises.forEach((e) => {
      out.push({ name: e.name, sets: e.sets, reps: e.reps, duration_seconds: e.duration_seconds, rest_seconds: e.rest_seconds });
    });
  });
  return out;
}

test('«מנוחה דקתיים» on an exercise line is two minutes of rest, not two minutes of work', () => {
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה דקתיים'), [
    { name: 'סקוואט', sets: 3, reps: 10, duration_seconds: null, rest_seconds: 120 }
  ]);
  assert.deepStrictEqual(rows('סקוואט 3x10 דקתיים מנוחה'), [
    { name: 'סקוואט', sets: 3, reps: 10, duration_seconds: null, rest_seconds: 120 }
  ]);
});

test('«מנוחה דקתיים וחצי» is 150 s of rest and leaves no «וחצי» in the name', () => {
  assert.deepStrictEqual(rows('סקוואט 3x10 מנוחה דקתיים וחצי'), [
    { name: 'סקוואט', sets: 3, reps: 10, duration_seconds: null, rest_seconds: 150 }
  ]);
  assert.deepStrictEqual(rows('פלאנק דקתיים וחצי'), [
    { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 150, rest_seconds: null }
  ]);
});

test('a rest line «מנוחה דקתיים בין הסטים» rests every exercise and is not merged into one', () => {
  const got = rows('סקוואט 3x10\nלאנג׳ 3x10\nמנוחה דקתיים בין הסטים');
  assert.deepStrictEqual(got.map((r) => [r.name, r.sets, r.reps, r.rest_seconds]), [
    ['סקוואט', 3, 10, 120],
    ['לאנג׳', 3, 10, 120]
  ]);
});

test('«פלאנק דקתיים» is still two minutes of work', () => {
  assert.deepStrictEqual(rows('פלאנק דקתיים'), [
    { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 120, rest_seconds: null }
  ]);
});
