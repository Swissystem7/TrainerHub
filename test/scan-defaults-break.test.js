'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

// scanDefaults reads a workout-header rest default. The change teaches it הפסקה
// alongside מנוחה; these cases pin the absolute default AND its parity with the
// מנוחה wording, covering all three header regexes the change touched.
const CASES = [
  { rest: '3 סבבים, מנוחה 45 שניות', brk: '3 סבבים, הפסקה 45 שניות', expected: { sets: 3, rest: 45, workSeconds: null } },
  { rest: '3 סבבים, 45 שניות מנוחה', brk: '3 סבבים, 45 שניות הפסקה', expected: { sets: 3, rest: 45, workSeconds: null } },
  { rest: '3 סבבים, דקה מנוחה', brk: '3 סבבים, דקה הפסקה', expected: { sets: 3, rest: 60, workSeconds: null } },
];

test('scanDefaults reads a הפסקה header default like a מנוחה one', () => {
  for (const c of CASES) {
    const viaBreak = THIngest.scanDefaults(c.brk);
    assert.deepStrictEqual(viaBreak, c.expected, `header "${c.brk}"`);
    assert.deepStrictEqual(
      viaBreak,
      THIngest.scanDefaults(c.rest),
      `header "${c.brk}" must scan identically to "${c.rest}"`
    );
  }
});

test('a הפסקה header default reaches the parsed exercises', () => {
  const res = THIngest.ingestText('3 סבבים, הפסקה 45 שניות: 40 שניות פלאנק, 15 שכיבות שמיכה', []);
  assert.ok(res.exercises.length >= 1);
  assert.strictEqual(res.exercises[0].rest_seconds, 45);
  assert.strictEqual(res.exercises[0].sets, 3);
});
