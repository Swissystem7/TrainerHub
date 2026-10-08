const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function pick(token) {
  const r = Ingest.parseExerciseToken(token, {});
  return { name: r.name, sets: r.sets, reps: r.reps, duration_seconds: r.duration_seconds };
}

test('clock time m:ss is timed work, not "1 30" in the name with 10 reps', () => {
  assert.deepStrictEqual(pick('פלאנק 1:30'), { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 90 });
  assert.deepStrictEqual(pick('0:45 קפיצות במקום'), { name: 'קפיצות במקום', sets: 1, reps: null, duration_seconds: 45 });
  assert.deepStrictEqual(pick('3x0:40 פלאנק צד'), { name: 'פלאנק צד', sets: 3, reps: null, duration_seconds: 40 });
});

test('seconds marked with a double quote or gershayim', () => {
  assert.deepStrictEqual(pick('פלאנק 30"'), { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 30 });
  assert.deepStrictEqual(pick('פלאנק 45״'), { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 45 });
});

test('a count written after the name is the reps', () => {
  assert.deepStrictEqual(pick('שכיבות סמיכה 15'), { name: 'שכיבות סמיכה', sets: 1, reps: 15, duration_seconds: null });
  assert.deepStrictEqual(pick('4 סטים סקוואט 12'), { name: 'סקוואט', sets: 4, reps: 12, duration_seconds: null });
});

test('existing forms keep working', () => {
  assert.deepStrictEqual(pick('10 שכיבות סמיכה'), { name: 'שכיבות סמיכה', sets: 1, reps: 10, duration_seconds: null });
  assert.deepStrictEqual(pick('3x10 לאנג׳'), { name: 'לאנג׳', sets: 3, reps: 10, duration_seconds: null });
  assert.deepStrictEqual(pick('פלאנק 40 שניות'), { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 40 });
  assert.deepStrictEqual(pick('ריצה 5 דקות'), { name: 'ריצה', sets: 1, reps: null, duration_seconds: 300 });
  assert.equal(Ingest.parseExerciseToken('מנוחה 1:00', {}).restOnly, true);
});
