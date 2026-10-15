'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

function rests(text) {
  return THIngest.ingestText(text, []).exercises.map((e) => e.rest_seconds);
}

test('«20 מנוחה» on its own line is 20 s rest, like «מנוחה 20» (was the default 60)', () => {
  assert.deepEqual(rests('סקוואט 15\n20 מנוחה\nסופרמן 3x10'), [20, 20]);
  assert.deepEqual(rests('סקוואט 15\nמנוחה 20\nסופרמן 3x10'), [20, 20]);
});

test('«45 הפסקה» between commas and «90 מנוחה» after a rounds header', () => {
  assert.deepEqual(rests('סקוואט 15, 45 הפסקה, סופרמן 12'), [45, 45]);
  assert.deepEqual(rests('3 סבבים: סקוואט 15, סופרמן 12, 90 מנוחה'), [null, 90]);
});

test('a bare «מנוחה» line still falls back to 60, and an exercise\'s reps are not its rest', () => {
  assert.deepEqual(rests('סקוואט 15\nמנוחה\nסופרמן 12'), [60, 60]);
  const r = THIngest.ingestText('סקוואט 15 מנוחה\nפלאנק 30 שניות', []);
  assert.equal(r.exercises[0].reps, 15);
  assert.equal(r.exercises[0].rest_seconds, null);
});

test('units still win: «2 דקות מנוחה» is 120, «20 שניות מנוחה» is 20', () => {
  assert.deepEqual(rests('סקוואט 15\n2 דקות מנוחה'), [120]);
  assert.deepEqual(rests('סקוואט 15\n20 שניות מנוחה'), [20]);
});
