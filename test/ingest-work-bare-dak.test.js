const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function timed(name, sets, seconds) {
  return { name, sets, reps: null, duration_seconds: seconds, rest_seconds: null, notes: null, restOnly: undefined };
}

test('a bare «דק» (no geresh) is minutes of work, not part of the name with 10 invented reps', () => {
  assert.deepStrictEqual(Ingest.parseExerciseToken('ריצה 5 דק', {}), timed('ריצה', 1, 300));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 2 דק', {}), timed('פלאנק', 1, 120));
  assert.deepStrictEqual(Ingest.parseExerciseToken('3 סטים פלאנק 1 דק', {}), timed('פלאנק', 3, 60));
});

test('half minutes with a bare «דק»', () => {
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 2 דק וחצי', {}), timed('פלאנק', 1, 150));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 1/2 דק', {}), timed('פלאנק', 1, 30));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק חצי דק', {}), timed('פלאנק', 1, 30));
});

test('a word that only starts with «דק» is not a minute', () => {
  const r = Ingest.parseExerciseToken('דקירות 10', {});
  assert.equal(r.name, 'דקירות');
  assert.equal(r.reps, 10);
  assert.equal(r.duration_seconds, null);
});

test('a pasted workout keeps the clean names and the minutes', () => {
  const ex = Ingest.ingestText('סקוואט 15 חזרות\nפלאנק 2 דק\nריצה במקום 5 דק').workout.phases[1].exercises;
  assert.deepStrictEqual(ex.map((e) => [e.name, e.reps, e.duration_seconds]), [
    ['סקוואט', 15, null],
    ['פלאנק', null, 120],
    ['ריצה במקום', null, 300],
  ]);
});
