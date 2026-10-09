'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

// The objective of this change is "זיהוי הפסקה כמילת מנוחה": הפסקה must behave
// exactly like מנוחה everywhere a rest duration is parsed. Each case pins the
// absolute number AND asserts parity with the מנוחה wording, so neither a
// הפסקה-only regression nor a change that breaks both wordings can slip through.
const CASES = [
  { rest: 'מנוחה 3 דקות', brk: 'הפסקה 3 דקות', seconds: 180 },
  { rest: '3 דקות מנוחה', brk: '3 דקות הפסקה', seconds: 180 },
  { rest: 'דקה וחצי מנוחה', brk: 'דקה וחצי הפסקה', seconds: 90 },
  { rest: 'מנוחה דקה וחצי', brk: 'הפסקה דקה וחצי', seconds: 90 },
  { rest: 'מנוחה חצי דקה', brk: 'הפסקה חצי דקה', seconds: 30 },
  { rest: 'מנוחה 45 שניות', brk: 'הפסקה 45 שניות', seconds: 45 },
  { rest: '45 שניות מנוחה', brk: '45 שניות הפסקה', seconds: 45 },
  { rest: 'שתי דקות מנוחה', brk: 'שתי דקות הפסקה', seconds: 120 },
  { rest: 'מנוחה דקה', brk: 'הפסקה דקה', seconds: 60 },
];

test('הפסקה parses to the same rest duration as מנוחה', () => {
  for (const c of CASES) {
    const viaBreak = THIngest.parseExerciseToken(c.brk, {});
    assert.deepStrictEqual(
      viaBreak,
      { restOnly: true, rest_seconds: c.seconds },
      `"${c.brk}" should be a ${c.seconds}s rest token`
    );
    assert.deepStrictEqual(
      viaBreak,
      THIngest.parseExerciseToken(c.rest, {}),
      `"${c.brk}" must parse identically to "${c.rest}"`
    );
  }
});

test('הפסקה rest duration survives a full ingestText pass', () => {
  const res = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, הפסקה 3 דקות', []);
  assert.strictEqual(res.exercises[1].rest_seconds, 180);

  const res2 = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, דקה וחצי הפסקה', []);
  assert.strictEqual(res2.exercises.length, 1);
  assert.strictEqual(res2.exercises[0].name, 'פלאנק');
  assert.strictEqual(res2.exercises[0].rest_seconds, 90);
});
