const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.notes]));
}

test('«(10 לכל צד)» after a count is the split of that count, a note', () => {
  // Was a clip-less name «סיבובים רוסים 10».
  const [twist] = rows('סיבובים רוסים 3x20 (10 לכל צד)');
  assert.deepStrictEqual(twist.slice(0, 4), ['סיבובים רוסים', 3, 20, null]);
  assert.match(twist[4], /10 לכל צד/);
  const [again] = rows('סיבובים רוסים 3x20 (10 חזרות לכל צד)');
  assert.deepStrictEqual(again.slice(0, 4), ['סיבובים רוסים', 3, 20, null]);
});

test('with no count outside, the bracket is still the count', () => {
  assert.deepStrictEqual(rows('לאנג׳ (10 לכל רגל)')[0].slice(0, 4), ['לאנג׳', 1, 10, null]);
  assert.deepStrictEqual(rows('לאנג׳ 3 סטים (12 לכל רגל)')[0].slice(0, 4), ['לאנג׳', 3, 12, null]);
  assert.deepStrictEqual(rows('לאנג׳ 3x10 (לכל רגל)')[0].slice(0, 4), ['לאנג׳', 3, 10, null]);
});
