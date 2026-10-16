const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.notes]));
}

test('«N/N» is the same count on each side, like «N+N»', () => {
  // Was a clip-less name «לאנג׳ 10/10» with 10 invented reps.
  const [lunge] = rows('לאנג׳ 10/10');
  assert.deepStrictEqual(lunge.slice(0, 4), ['לאנג׳', 1, 10, null]);
  assert.match(lunge[4], /לכל צד/);
  // Was a name «לאנג׳ /10».
  assert.deepStrictEqual(rows('לאנג׳ 3x10/10')[0].slice(0, 4), ['לאנג׳', 3, 10, null]);
  // Was 8 sets of 8.
  assert.deepStrictEqual(rows('הרמת רגל 8/8')[0].slice(0, 4), ['הרמת רגל', 1, 8, null]);
  // Was a name «פלאנק צד 20».
  const [plank] = rows('פלאנק צד 20/20 שניות');
  assert.deepStrictEqual(plank.slice(0, 4), ['פלאנק צד', 1, null, 20]);
  assert.match(plank[4], /לכל צד/);
});

test('an explicit side cue is kept once, an uneven split goes to the notes', () => {
  const [lunge] = rows('לאנג׳ 12/12 לכל רגל');
  assert.deepStrictEqual(lunge.slice(0, 4), ['לאנג׳', 1, 12, null]);
  assert.doesNotMatch(lunge[4], /לכל צד/);
  const [uneven] = rows('לאנג׳ 10/12');
  assert.deepStrictEqual(uneven.slice(0, 4), ['לאנג׳', 1, 10, null]);
  assert.match(uneven[4], /10\/12/);
});

test('sets/reps, half minutes and intervals keep their meaning', () => {
  assert.deepStrictEqual(rows('סקוואט 4/12')[0].slice(0, 4), ['סקוואט', 4, 12, null]);
  assert.deepStrictEqual(rows('פלאנק 3/30 שניות')[0].slice(0, 4), ['פלאנק', 3, null, 30]);
  assert.deepStrictEqual(rows('פלאנק 1/2 דקה')[0].slice(0, 4), ['פלאנק', 1, null, 30]);
  assert.deepStrictEqual(rows('ברפי 40/20')[0].slice(0, 4), ['ברפי', 1, null, 40]);
});
