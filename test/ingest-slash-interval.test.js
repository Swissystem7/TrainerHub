const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]);
}

test('«40/20» on its own line is the work/rest of every exercise', () => {
  // Was a phantom exercise «40/20» with 10 invented reps, and the rest untimed.
  assert.deepStrictEqual(rows('40/20\nברפי\nסקוואט'), [['ברפי', 1, null, 40, 20], ['סקוואט', 1, null, 40, 20]]);
  // Was an exercise «טבאטה 20/10».
  assert.deepStrictEqual(rows('טבאטה 20/10\nברפי'), [['ברפי', 1, null, 20, 10]]);
  assert.deepStrictEqual(rows('אינטרוול 40/20\nברפי'), [['ברפי', 1, null, 40, 20]]);
  // Was an exercise «עבודה/ /20» with 40 s rest.
  assert.deepStrictEqual(rows('עבודה/מנוחה 40/20\nברפי'), [['ברפי', 1, null, 40, 20]]);
  // Was 3 rounds of 10 invented reps.
  assert.deepStrictEqual(rows('40/20 x3\nברפי'), [['ברפי', 3, null, 40, 20]]);
});

test('«ברפי 40/20» is that exercise\'s work/rest, not part of its name', () => {
  assert.deepStrictEqual(rows('ברפי 40/20'), [['ברפי', 1, null, 40, 20]]);
  assert.deepStrictEqual(rows('ברפי 30/15 שניות'), [['ברפי', 1, null, 30, 15]]);
  assert.deepStrictEqual(rows('3 סבבים:\nברפי 40/20\nסקוואט 15'), [['ברפי', 3, null, 40, 20], ['סקוואט', 3, 15, null, null]]);
});

test('a small slash is still sets/reps or half a minute', () => {
  assert.deepStrictEqual(rows('סקוואט 3/12'), [['סקוואט', 3, 12, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3/30"'), [['פלאנק', 3, null, 30, null]]);
  assert.deepStrictEqual(rows('פלאנק 1/2 דקה'), [['פלאנק', 1, null, 30, null]]);
  // «10/10» / «20/20» on a lunge is per leg, not 10 s of work.
  assert.equal(rows('לאנג׳ 10/10')[0][3], null);
  assert.equal(rows('לאנג׳ 20/20')[0][3], null);
});
