const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.notes]));
}

test('«N+N» is the same count on each side, not part of the name', () => {
  // Was a clip-less «פלאנק צד 30+» of 30 s.
  const [plank] = rows('פלאנק צד 30+30 שניות');
  assert.deepStrictEqual(plank.slice(0, 4), ['פלאנק צד', 1, null, 30]);
  assert.match(plank[4], /לכל צד/);
  // Was a name «לאנג׳ 10+10» with the reps taken from the second 10.
  const [lunge] = rows('לאנג׳ 3x10+10');
  assert.deepStrictEqual(lunge.slice(0, 4), ['לאנג׳', 3, 10, null]);
  assert.match(lunge[4], /לכל צד/);
  assert.deepStrictEqual(rows('פלאנק צד 30 שניות + 30 שניות')[0].slice(0, 4), ['פלאנק צד', 1, null, 30]);
  assert.deepStrictEqual(rows('פלאנק 30+30"')[0].slice(0, 4), ['פלאנק', 1, null, 30]);
});

test('an explicit side cue is kept once, an uneven split goes to the notes', () => {
  const [lunge] = rows('לאנג׳ 10+10 לכל רגל');
  assert.deepStrictEqual(lunge.slice(0, 4), ['לאנג׳', 1, 10, null]);
  assert.match(lunge[4], /לכל רגל/);
  assert.doesNotMatch(lunge[4], /לכל צד/);
  const [squat] = rows('סקוואט 20+10');
  assert.deepStrictEqual(squat.slice(0, 4), ['סקוואט', 1, 20, null]);
  assert.match(squat[4], /20\+10/);
});

test('a «+» between exercises still splits or stays a combo', () => {
  assert.deepStrictEqual(rows('שכיבות סמיכה 20 + פלאנק 30 שניות').map((r) => r.slice(0, 4)), [
    ['שכיבות סמיכה', 1, 20, null],
    ['פלאנק', 1, null, 30],
  ]);
  assert.deepStrictEqual(rows('סקוואט + קפיצה 10').map((r) => r.slice(0, 4)), [['סקוואט + קפיצה', 1, 10, null]]);
});
