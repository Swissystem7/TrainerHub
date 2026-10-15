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

function pick(token, defaults) {
  const r = Ingest.parseExerciseToken(token, defaults || {});
  return { name: r.name, sets: r.sets, reps: r.reps, duration_seconds: r.duration_seconds, rest_seconds: r.rest_seconds };
}

function main(text) {
  return Ingest.ingestText(text, []).exercises.map(function (ex) {
    return { name: ex.name, sets: ex.sets, reps: ex.reps, duration_seconds: ex.duration_seconds, rest_seconds: ex.rest_seconds };
  });
}

test('a bare ×N multiplier is the sets, before or after the prescription', () => {
  assert.deepStrictEqual(pick('פלאנק 45 שניות x3'), { name: 'פלאנק', sets: 3, reps: null, duration_seconds: 45, rest_seconds: null });
  assert.deepStrictEqual(pick('בטן 20 חזרות x 4'), { name: 'בטן', sets: 4, reps: 20, duration_seconds: null, rest_seconds: null });
  assert.deepStrictEqual(pick('שכיבות סמיכה x3 12 חזרות'), { name: 'שכיבות סמיכה', sets: 3, reps: 12, duration_seconds: null, rest_seconds: null });
  assert.deepStrictEqual(pick('סקוואט 15 x 3 סטים'), { name: 'סקוואט', sets: 3, reps: 15, duration_seconds: null, rest_seconds: null });
  assert.deepStrictEqual(pick('פלאנק צד 30 שניות לכל צד x3'), { name: 'פלאנק צד לכל צד', sets: 3, reps: null, duration_seconds: 30, rest_seconds: null });
  // The old form keeps its meaning.
  assert.deepStrictEqual(pick('פלאנק - 3 סטים × 45 שניות'), { name: 'פלאנק', sets: 3, reps: null, duration_seconds: 45, rest_seconds: null });
});

test('sets × seconds and "N סטים M שניות" are timed work, not M reps with "שניות" in the name', () => {
  assert.deepStrictEqual(pick('פלאנק 3x45 שניות'), { name: 'פלאנק', sets: 3, reps: null, duration_seconds: 45, rest_seconds: null });
  assert.deepStrictEqual(pick('סופרמן 3 סטים 15 שניות'), { name: 'סופרמן', sets: 3, reps: null, duration_seconds: 15, rest_seconds: null });
  assert.deepStrictEqual(pick('סקוואט 3 x 15 חזרות'), { name: 'סקוואט', sets: 3, reps: 15, duration_seconds: null, rest_seconds: null });
  assert.deepStrictEqual(pick('מתח 3 סטים של 8'), { name: 'מתח', sets: 3, reps: 8, duration_seconds: null, rest_seconds: null });
  assert.deepStrictEqual(pick('3 סטים 12 שני הצדדים'), { name: 'שני הצדדים', sets: 3, reps: 12, duration_seconds: null, rest_seconds: null });
});

test('"N סבבים" inside an exercise line is its sets, not part of the name', () => {
  assert.deepStrictEqual(pick('סקוואט קפיצה 10 חזרות 3 סבבים'), { name: 'סקוואט קפיצה', sets: 3, reps: 10, duration_seconds: null, rest_seconds: null });
});

test('a rest clause on an exercise line is that exercise\'s rest; the line is not a rest line', () => {
  assert.deepStrictEqual(pick('לאנג׳ 10 חזרות מנוחה 30 שניות'), { name: 'לאנג׳', sets: 1, reps: 10, duration_seconds: null, rest_seconds: 30 });
  assert.deepStrictEqual(pick('סקוואט 4 סטים של 12 חזרות עם 60 שניות מנוחה'), { name: 'סקוואט', sets: 4, reps: 12, duration_seconds: null, rest_seconds: 60 });
  assert.deepStrictEqual(pick('שכיבות סמיכה - 3 סטים x 12 חזרות - מנוחה 45 שניות'), { name: 'שכיבות סמיכה', sets: 3, reps: 12, duration_seconds: null, rest_seconds: 45 });
  assert.deepStrictEqual(pick('פלאנק 40 שניות מנוחה של דקה בין הסטים'), { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 40, rest_seconds: 60 });
  assert.deepStrictEqual(pick('מנוחה פעילה - הליכה 2 דקות'), { name: 'הליכה', sets: 1, reps: null, duration_seconds: 120, rest_seconds: null });
  assert.equal(main('לאנג׳ 10 חזרות מנוחה 30 שניות').length, 1);
});

test('rest-only lines stay rest-only, and a clock rest is minutes:seconds', () => {
  for (const line of ['מנוחה', 'הפסקה בין סטים', 'מנוחה בין הסטים 60 שניות', 'מנוחה פעילה', 'מנוחה 3 דקות', 'דקה וחצי מנוחה', 'מנוחה 1:00']) {
    assert.equal(Ingest.isRestToken(line), true, line);
  }
  assert.equal(Ingest.isRestToken('לאנג׳ 10 חזרות מנוחה 30 שניות'), false);
  assert.deepStrictEqual(Ingest.parseExerciseToken('מנוחה 1:00', {}), { restOnly: true, rest_seconds: 60 });
  assert.deepStrictEqual(Ingest.parseExerciseToken('מנוחה בין הסטים 60 שניות', {}), { restOnly: true, rest_seconds: 60 });
  assert.deepStrictEqual(Ingest.parseExerciseToken('מנוחה 3 דקות', {}), { restOnly: true, rest_seconds: 180 });
});

test('sets split off by a comma land on the exercise before them', () => {
  assert.deepStrictEqual(main('מתח 5 חזרות, 4 סטים'), [
    { name: 'מתח', sets: 4, reps: 5, duration_seconds: null, rest_seconds: null }
  ]);
  assert.deepStrictEqual(Ingest.parseExerciseToken('4 סטים', {}), { continuation: true, sets: 4, rest_seconds: null });
  // Before any exercise, the sets become the default for the lines that follow.
  const out = main('4 סטים\nסקוואט 10\nשכיבות סמיכה 8');
  assert.deepStrictEqual(out.map(function (e) { return e.sets; }), [4, 4]);
});

test('list numbering does not become part of the name or a count', () => {
  assert.deepStrictEqual(main('1. סקוואט 15\n2) שכיבות סמיכה 10\nתרגיל 3: פלאנק 30 שניות').map(function (e) { return [e.name, e.reps, e.duration_seconds]; }), [
    ['סקוואט', 15, null],
    ['שכיבות סמיכה', 10, null],
    ['פלאנק', null, 30]
  ]);
  // Not numbering: a decimal minute count and a clock time.
  assert.deepStrictEqual(pick('3.5 דקות ריצה'), { name: 'ריצה', sets: 1, reps: null, duration_seconds: 210, rest_seconds: null });
  assert.deepStrictEqual(pick('1:30 פלאנק'), { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 90, rest_seconds: null });
});
