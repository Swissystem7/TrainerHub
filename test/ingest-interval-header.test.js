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

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds]));
}

test('«טבאטה 8 סבבים 20/10:» is the interval of the exercises under it, not an exercise «טבאטה»', () => {
  // Was a phantom «טבאטה» of 8 sets (20 s work, 10 s rest) and three rows of 8 sets × 10 invented reps:
  // the rounds word left letters on the header line, so it passed as a name and was not the paste's interval.
  assert.deepStrictEqual(rows('טבאטה 8 סבבים 20/10:\nסקוואט קפיצה\nשכיבות סמיכה\nהרים מטפסים'), [
    ['סקוואט קפיצה', 8, null, 20, 10],
    ['שכיבות סמיכה', 8, null, 20, 10],
    ['הרים מטפסים', 8, null, 20, 10]
  ]);
  assert.deepStrictEqual(rows('HIIT 6 סבבים 40/20\nברפי\nסקוואט'), [['ברפי', 6, null, 40, 20], ['סקוואט', 6, null, 40, 20]]);
  assert.deepStrictEqual(rows('טבאטה 8 סבבים של 20/10:\nסקוואט'), [['סקוואט', 8, null, 20, 10]]);
  // The header is not listed as unmatched and queues no clip wish.
  const out = Ingest.ingestText('טבאטה 8 סבבים 20/10:\nסקוואט קפיצה');
  assert.deepStrictEqual(out.unmatched, ['סקוואט קפיצה']);
  assert.ok(!out.wishlist.some((w) => w.he === 'טבאטה'));
});

test('«טבאטה 20/10 x8» gives its 8 rounds to every exercise', () => {
  // Was a phantom «טבאטה» of 8 sets and rows of a single set: the «x» of «x8» counted as a letter.
  assert.deepStrictEqual(rows('טבאטה 20/10 x8:\nסקוואט\nברפי'), [['סקוואט', 8, null, 20, 10], ['ברפי', 8, null, 20, 10]]);
  assert.deepStrictEqual(rows('טבאטה 20/10 x8\nסקוואט'), [['סקוואט', 8, null, 20, 10]]);
  assert.deepStrictEqual(rows('אינטרוול 40/20 x6:\nברפי'), [['ברפי', 6, null, 40, 20]]);
  assert.deepStrictEqual(rows('טבאטה: 20/10 x8\nסקוואט'), [['סקוואט', 8, null, 20, 10]]);
  assert.deepStrictEqual(rows('8 x 20/10\nברפי'), [['ברפי', 8, null, 20, 10]]);
  // A bare «40/20 x3» line still works as before.
  assert.deepStrictEqual(rows('40/20 x3\nברפי\nסקוואט'), [['ברפי', 3, null, 40, 20], ['סקוואט', 3, null, 40, 20]]);
});

test('the header before a colon introduces the exercises on its own line', () => {
  // Was one exercise named «טבאטה סקוואט קפיצה» of 8 sets and a «ברפי» of 10 invented reps.
  assert.deepStrictEqual(rows('טבאטה 8 סבבים של 20/10: סקוואט קפיצה, ברפי'), [['סקוואט קפיצה', 8, null, 20, 10], ['ברפי', 8, null, 20, 10]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nטבאטה 8 סבבים 20/10: ברפי, סקוואט קפיצה').slice(1), [['ברפי', 8, null, 20, 10], ['סקוואט קפיצה', 8, null, 20, 10]]);
});

test('an exercise with its own interval and rounds keeps its name', () => {
  assert.deepStrictEqual(rows('ברפי 40/20 x3\nסקוואט 15'), [['ברפי', 3, null, 40, 20], ['סקוואט', 1, 15, null, null]]);
  assert.deepStrictEqual(rows('טבאטה 20/10\nברפי'), [['ברפי', 1, null, 20, 10]]);
  assert.deepStrictEqual(rows('3 סבבים:\nברפי 40/20\nסקוואט 15'), [['ברפי', 3, null, 40, 20], ['סקוואט', 3, 15, null, null]]);
  // «סקוואט 4/12» is still sets/reps.
  assert.deepStrictEqual(rows('סקוואט 4/12'), [['סקוואט', 4, 12, null, null]]);
});
