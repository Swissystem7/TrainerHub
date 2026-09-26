'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Ingest = require('../js/ingest.js');

function shape(parsed) {
  return {
    name: parsed.name,
    reps: parsed.reps,
    duration_seconds: parsed.duration_seconds
  };
}

test('parseExerciseToken parses minute-based work tokens as duration with clean names', function () {
  assert.deepEqual(
    shape(Ingest.parseExerciseToken('פלאנק דקה', {})),
    { name: 'פלאנק', reps: null, duration_seconds: 60 }
  );

  assert.deepEqual(
    shape(Ingest.parseExerciseToken('3 דקות ריצה במקום', {})),
    { name: 'ריצה במקום', reps: null, duration_seconds: 180 }
  );

  assert.equal(Ingest.parseExerciseToken('פלאנק חצי דקה', {}).duration_seconds, 30);
  assert.equal(Ingest.parseExerciseToken('פלאנק דקה וחצי', {}).duration_seconds, 90);
});

test('rest tokens still route to restOnly and seconds parsing still works', function () {
  const rest = Ingest.parseExerciseToken('מנוחה דקה', {});
  assert.equal(rest.restOnly, true);
  assert.equal(rest.rest_seconds, 60);

  assert.equal(Ingest.parseExerciseToken('פלאנק 40 שניות', {}).duration_seconds, 40);
});
