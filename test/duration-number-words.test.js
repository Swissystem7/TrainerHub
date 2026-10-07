const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// Minutes written as Hebrew number words used to return null, so the
// workout fell back to the 20-minute default.
test('parseDuration reads minutes written as Hebrew number words', () => {
  assert.strictEqual(THPrompt.parseDuration('עשרים דקות בטן'), 20);
  assert.strictEqual(THPrompt.parseDuration('אימון של עשר דקות'), 10);
  assert.strictEqual(THPrompt.parseDuration('חמש עשרה דקות רגליים'), 15);
  assert.strictEqual(THPrompt.parseDuration('ארבעים וחמש דקות גב'), 45);
  assert.strictEqual(THPrompt.parseDuration('שלושים דק פול בודי'), 30);
});

test('parseDuration adds number-word minutes to the hour', () => {
  assert.strictEqual(THPrompt.parseDuration('שעה ועשרים דקות'), 80);
  assert.strictEqual(THPrompt.parseDuration('שעה וחמש עשרה דקות'), 75);
  assert.strictEqual(THPrompt.parseDuration('שעתיים ועשר דקות'), 130);
});

test('parseDuration knows שלושת רבעי שעה', () => {
  assert.strictEqual(THPrompt.parseDuration('שלושת רבעי שעה בטן'), 45);
  assert.strictEqual(THPrompt.parseDuration('שלוש רבעי שעה'), 45);
});

test('a non-number word before דקות is not a duration', () => {
  assert.strictEqual(THPrompt.parseDuration('כמה דקות של בטן'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון בטן'), null);
});

test('parsePrompt carries number-word minutes through', () => {
  const p = THPrompt.parsePrompt('עשרים חניכים עשרים דקות בטן');
  assert.strictEqual(p.duration, 20);
  assert.strictEqual(p.durationSpecified, true);
  assert.strictEqual(p.participants, 20);
  const q = THPrompt.parsePrompt('אימון בטן');
  assert.strictEqual(q.duration, 20);
  assert.strictEqual(q.durationSpecified, false);
});
