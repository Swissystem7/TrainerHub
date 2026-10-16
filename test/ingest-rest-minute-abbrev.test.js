'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

function rests(text) {
  return THIngest.ingestText(text, []).exercises.map((e) => e.rest_seconds);
}

test('«מנוחה 2 דק׳» is two minutes of rest, not 2 s', () => {
  assert.deepEqual(rests('סקוואט 15\nמנוחה 2 דק׳\nסופרמן 12'), [120, 120]);
  assert.deepEqual(rests("סקוואט 15\nמנוחה 2 דק'\nסופרמן 12"), [120, 120]);
  assert.deepEqual(rests('סקוואט 15\n2 דק׳ מנוחה\nסופרמן 12'), [120, 120]);
  assert.equal(rests('סקוואט 3x15 מנוחה 2 דק׳\nסופרמן 12')[0], 120);
});

test('a half minute on top is kept: «מנוחה 2 דקות וחצי» is 150 s (was 120), «2 דק׳ וחצי» too', () => {
  assert.deepEqual(rests('סקוואט 15\nמנוחה 2 דקות וחצי\nסופרמן 12'), [150, 150]);
  assert.deepEqual(rests('סקוואט 15\nמנוחה 2 דק׳ וחצי\nסופרמן 12'), [150, 150]);
  assert.deepEqual(rests('סקוואט 3x15 מנוחה דקה וחצי\nסופרמן 12'), [90, 90]);
});

test('half a minute of rest is 30 s: «מנוחה 1/2 דקה» was 1 s, «מנוחה חצי דק׳» was a phantom exercise', () => {
  assert.deepEqual(rests('סקוואט 15\nמנוחה 1/2 דקה\nסופרמן 12'), [30, 30]);
  assert.deepEqual(rests('סקוואט 15\nמנוחה 1/2 דק׳\nסופרמן 12'), [30, 30]);
  assert.deepEqual(rests('סקוואט 15\nמנוחה ½ דקה\nסופרמן 12'), [30, 30]);
  const r = THIngest.ingestText('סקוואט 15\nמנוחה חצי דק׳\nסופרמן 12', []);
  assert.deepEqual(r.exercises.map((e) => e.name), ['סקוואט', 'סופרמן']);
  assert.deepEqual(r.exercises.map((e) => e.rest_seconds), [30, 30]);
});

test('«מנוחה 1.5 דקות» is 90 s (was 1 s)', () => {
  assert.deepEqual(rests('סקוואט 15\nמנוחה 1.5 דקות\nסופרמן 12'), [90, 90]);
});

test('unchanged: whole minutes, seconds and clock rests', () => {
  assert.deepEqual(rests('סקוואט 15\nמנוחה 3 דקות\nסופרמן 12'), [180, 180]);
  assert.deepEqual(rests('סקוואט 15\nמנוחה 90 שנ׳\nסופרמן 12'), [90, 90]);
  assert.deepEqual(rests('סקוואט 15 מנוחה 1:00'), [60]);
  assert.deepEqual(rests('סקוואט 3x10 מנוחה 90'), [90]);
});
