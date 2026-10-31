const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('«סיבובים» after a count is rounds, not part of the name', () => {
  assert.deepStrictEqual(rows('בורפי 3 סיבובים של 10'), [['בורפי', 3, 10, null]]);
  assert.deepStrictEqual(rows('שכיבות סמיכה 10 חזרות 4 סיבובים'), [['שכיבות סמיכה', 4, 10, null]]);
  assert.deepStrictEqual(rows('סקוואט שלושה סיבובים של 12'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(rows('פלאנק 3 סיבובים 30 שניות'), [['פלאנק', 3, null, 30]]);
});

test('a «סיבובים:» header gives its rounds to the exercises under it', () => {
  assert.deepStrictEqual(rows('4 סיבובים:\nסקוואט 10\nבורפי 5'), [['סקוואט', 4, 10, null], ['בורפי', 4, 5, null]]);
});

test('a turning exercise keeps its own «סיבוב»', () => {
  assert.deepStrictEqual(rows('סיבוב גו 3x10'), [['סיבוב גו', 3, 10, null]]);
  assert.strictEqual(rows('סיבובי ידיים 10 סיבובים')[0][1], 1);
});
