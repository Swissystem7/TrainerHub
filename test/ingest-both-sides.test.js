const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.notes]));
}

test('«שני הצדדים» is the count on each side, not part of the name', () => {
  // Was a clip-less name «לאנג׳ 12 שני הצדדים» with 10 invented reps.
  const [lunge] = rows('לאנג׳ 12 שני הצדדים');
  assert.deepStrictEqual(lunge.slice(0, 4), ['לאנג׳', 1, 12, null]);
  assert.match(lunge[4], /לכל צד/);
  // Was a name «לאנג׳ לשני הצדדים».
  assert.deepStrictEqual(rows('לאנג׳ 3x12 לשני הצדדים')[0].slice(0, 4), ['לאנג׳', 3, 12, null]);
  assert.deepStrictEqual(rows('לאנג׳ 12 משני הצדדים')[0].slice(0, 4), ['לאנג׳', 1, 12, null]);
  assert.deepStrictEqual(rows('הרמת רגל 2 צדדים 10')[0].slice(0, 4), ['הרמת רגל', 1, 10, null]);
});

test('the side cue is noted once and a direction stays in the name', () => {
  const [lunge] = rows('לאנג׳ 10/10 לשני הצדדים');
  assert.deepStrictEqual(lunge.slice(0, 4), ['לאנג׳', 1, 10, null]);
  assert.strictEqual(lunge[4].match(/לכל צד/g).length, 1);
  assert.deepStrictEqual(rows('לאנג׳ 3x10 לצד')[0].slice(0, 4), ['לאנג׳ לצד', 3, 10, null]);
});
