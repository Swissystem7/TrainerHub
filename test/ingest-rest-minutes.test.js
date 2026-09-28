

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

test('parseRestSeconds and ingestText rest parsing', () => {
  // Test parseExerciseToken with various rest expressions
  assert.deepStrictEqual(THIngest.parseExerciseToken('מנוחה 3 דקות', {}), { restOnly: true, rest_seconds: 180 });
  assert.strictEqual(THIngest.parseExerciseToken('3 דקות מנוחה', {}).rest_seconds, 180);
  assert.strictEqual(THIngest.parseExerciseToken('דקה וחצי מנוחה', {}).rest_seconds, 90);
  assert.strictEqual(THIngest.parseExerciseToken('מנוחה דקה וחצי', {}).rest_seconds, 90);
  assert.strictEqual(THIngest.parseExerciseToken('מנוחה חצי דקה', {}).rest_seconds, 30);

  // Test ingestText with rest parsing
  const result1 = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, מנוחה 3 דקות', []);
  assert.strictEqual(result1.exercises[1].rest_seconds, 180);

  const result2 = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, דקה וחצי מנוחה', []);
  assert.strictEqual(result2.exercises.length, 1);
  assert.strictEqual(result2.exercises[0].name, 'פלאנק');
  assert.strictEqual(result2.exercises[0].rest_seconds, 90);
});
