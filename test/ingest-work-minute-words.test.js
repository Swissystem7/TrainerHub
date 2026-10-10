const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function timed(token) {
  const r = Ingest.parseExerciseToken(token, {});
  return { name: r.name, reps: r.reps, duration_seconds: r.duration_seconds };
}

test('decimal minutes are seconds of work, not part of the name', () => {
  assert.deepStrictEqual(timed('פלאנק 1.5 דקות'), { name: 'פלאנק', reps: null, duration_seconds: 90 });
  assert.deepStrictEqual(timed('ריצה במקום 2.5 דק׳'), { name: 'ריצה במקום', reps: null, duration_seconds: 150 });
});

test('"2 דקות וחצי" adds half a minute and leaves no "וחצי" in the name', () => {
  assert.deepStrictEqual(timed('פלאנק 2 דקות וחצי'), { name: 'פלאנק', reps: null, duration_seconds: 150 });
});

test('דקתיים and minutes written as number words', () => {
  assert.deepStrictEqual(timed('פלאנק דקתיים'), { name: 'פלאנק', reps: null, duration_seconds: 120 });
  assert.deepStrictEqual(timed('שתי דקות ריצה במקום'), { name: 'ריצה במקום', reps: null, duration_seconds: 120 });
  assert.deepStrictEqual(timed('פלאנק שלוש דקות'), { name: 'פלאנק', reps: null, duration_seconds: 180 });
  assert.deepStrictEqual(timed('קפיצות חמש דקות'), { name: 'קפיצות', reps: null, duration_seconds: 300 });
  assert.deepStrictEqual(timed('פלאנק דקה אחת'), { name: 'פלאנק', reps: null, duration_seconds: 60 });
});

test('singular שנייה counts as seconds', () => {
  assert.deepStrictEqual(timed('פלאנק 30 שנייה'), { name: 'פלאנק', reps: null, duration_seconds: 30 });
});

test('a number word that is not followed by דקות stays in the name', () => {
  assert.deepStrictEqual(timed('שלוש קפיצות'), { name: 'שלוש קפיצות', reps: 10, duration_seconds: null });
});
