const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function timed(name, sets, seconds) {
  return { name, sets, reps: null, duration_seconds: seconds, rest_seconds: null, notes: null, restOnly: undefined };
}

test('«1/2 דק׳» / «½ דק\'» / «חצי דק׳» are half a minute, not 120 s or an untimed exercise', () => {
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 1/2 דק׳', {}), timed('פלאנק', 1, 30));
  assert.deepStrictEqual(Ingest.parseExerciseToken("פלאנק ½ דק'", {}), timed('פלאנק', 1, 30));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק חצי דק׳', {}), timed('פלאנק', 1, 30));
  assert.deepStrictEqual(Ingest.parseExerciseToken('3 סטים פלאנק 1/2 דק׳', {}), timed('פלאנק', 3, 30));
});

test('«2 דק׳ וחצי» / «1 דק׳ ו-1/2» keep the half minute and leave the name clean', () => {
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 2 דק׳ וחצי', {}), timed('פלאנק', 1, 150));
  assert.deepStrictEqual(Ingest.parseExerciseToken("פלאנק 2 דק' וחצי", {}), timed('פלאנק', 1, 150));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 1 דק׳ ו-1/2', {}), timed('פלאנק', 1, 90));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 1 דקה וחצי', {}), timed('פלאנק', 1, 90));
});

test('whole-minute forms are unchanged', () => {
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 2 דק׳', {}), timed('פלאנק', 1, 120));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 1/2 דקה', {}), timed('פלאנק', 1, 30));
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק 2 דקות וחצי', {}), timed('פלאנק', 1, 150));
});
