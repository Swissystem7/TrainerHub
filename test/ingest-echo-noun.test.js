const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function row(text) {
  const e = Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises)[0];
  return [e.name, e.sets, e.reps, e.duration_seconds];
}

test('a count followed by a noun repeating the name is the reps', () => {
  // Was a clip-less name «קפיצות חבל 100 קפיצות» with 10 invented reps.
  assert.deepStrictEqual(row('קפיצות חבל 100 קפיצות'), ['קפיצות חבל', 1, 100, null]);
  assert.deepStrictEqual(row('שכיבות סמיכה 20 שכיבות'), ['שכיבות סמיכה', 1, 20, null]);
  assert.deepStrictEqual(row('סקוואט 15 סקוואטים'), ['סקוואט', 1, 15, null]);
  assert.deepStrictEqual(row('לחיצת חזה 10 לחיצות'), ['לחיצת חזה', 1, 10, null]);
  // Was «קפיצות חבל קפיצות» 3x50.
  assert.deepStrictEqual(row('קפיצות חבל 3x50 קפיצות'), ['קפיצות חבל', 3, 50, null]);
  assert.deepStrictEqual(row('קפיצות חבל 100 קפיצות, מנוחה 30 שניות').slice(0, 3), ['קפיצות חבל', 1, 100]);
});

test('a noun that does not repeat the name, or does not end the token, is left alone', () => {
  assert.deepStrictEqual(row('פלאנק 30 שניות'), ['פלאנק', 1, null, 30]);
  assert.deepStrictEqual(row('ברפי עבודה 40 שניות מנוחה 20 שניות'), ['ברפי', 1, null, 40]);
  assert.strictEqual(row('סקוואט 3x12 סקוואט קפיצה')[0], 'סקוואט סקוואט קפיצה');
});

test('a transliterated name is echoed by its Hebrew noun', () => {
  // Was a clip-less name «ג'אמפינג ג'קס 30 קפיצות» with 10 invented reps.
  assert.deepStrictEqual(row("ג'אמפינג ג'קס 30 קפיצות"), ["ג'אמפינג ג'קס", 1, 30, null]);
  assert.deepStrictEqual(row('ג׳אמפינג ג׳קס 3x40 קפיצות'), ['ג׳אמפינג ג׳קס', 3, 40, null]);
  assert.deepStrictEqual(row('jumping jacks 30 קפיצות'), ['jumping jacks', 1, 30, null]);
  // A name that is not a jump keeps the noun: «סקוואט 12 קפיצות» may be jump squats.
  assert.strictEqual(row('סקוואט 12 קפיצות')[0], 'סקוואט 12 קפיצות');
});
