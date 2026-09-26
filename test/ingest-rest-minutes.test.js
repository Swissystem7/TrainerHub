

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

test('parseRestSeconds and splitTokens with Hebrew time expressions', () => {
  // Test parseExerciseToken with 'מנוחה 3 דקות' -> { restOnly: true, rest_seconds: 180 }
  let result = THIngest.parseExerciseToken('מנוחה 3 דקות', {});
  assert.ok(result);
  assert.strictEqual(result.restOnly, true);
  assert.strictEqual(result.rest_seconds, 180);

  // Test parseExerciseToken with '3 דקות מנוחה' -> 180
  result = THIngest.parseExerciseToken('3 דקות מנוחה', {});
  assert.strictEqual(result, 180);

  // Test parseExerciseToken with 'דקה וחצי מנוחה' and 'מנוחה דקה וחצי' -> 90
  result = THIngest.parseExerciseToken('דקה וחצי מנוחה', {});
  assert.strictEqual(result, 90);
  
  result = THIngest.parseExerciseToken('מנוחה דקה וחצי', {});
  assert.strictEqual(result, 90);

  // Test parseExerciseToken with 'מנוחה חצי דקה' -> 30
  result = THIngest.parseExerciseToken('מנוחה חצי דקה', {});
  assert.strictEqual(result, 30);

  // Test ingestText with '3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, מנוחה 3 דקות'
  let r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, מנוחה 3 דקות', []);
  assert.strictEqual(r.exercises[1].rest_seconds, 180);

  // Test ingestText with '3 סבבים: 40 שניות פלאנק, דקה וחצי מנוחה'
  r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, דקה וחצי מנוחה', []);
  assert.strictEqual(r.exercises.length, 1);
  assert.strictEqual(r.exercises[0].name, 'פלאנק');
  assert.strictEqual(r.exercises[0].rest_seconds, 90);
});
