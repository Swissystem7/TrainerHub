const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

test('«N צעדים» is the reps, not part of the name', () => {
  // Was a name «לאנג׳ים הליכה 20 צעדים» with 10 invented reps.
  assert.deepStrictEqual(rows('לאנג׳ים הליכה 20 צעדים'), [['לאנג׳ים הליכה', 1, 20, null]]);
  assert.deepStrictEqual(rows('לאנג׳ים 20 צעד'), [['לאנג׳ים', 1, 20, null]]);
  assert.deepStrictEqual(rows('לאנג׳ים עשרים צעדים'), [['לאנג׳ים', 1, 20, null]]);
  // Was a name «לאנג׳ים צעדים».
  assert.deepStrictEqual(rows('לאנג׳ים 3x20 צעדים'), [['לאנג׳ים', 3, 20, null]]);
  assert.deepStrictEqual(rows('לאנג׳ים הליכה 3 סטים של 20 צעדים'), [['לאנג׳ים הליכה', 3, 20, null]]);
});

test('«צעדים» without a count stays in the name', () => {
  assert.deepStrictEqual(rows('צעדים צידיים 20'), [['צעדים צידיים', 1, 20, null]]);
});
