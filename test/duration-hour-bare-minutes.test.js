const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// «שעה ועשרים» (an hour and twenty) fell to the 20-minute default, and
// «שעתיים ועשרים» read only its 120: the minutes came with no «דקות».
test('parseDuration adds minutes written after an hour without «דקות»', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה ועשרים'), 80);
  assert.strictEqual(THPrompt.parsePrompt('אימון של שעה ועשרים').durationSpecified, true);
  assert.strictEqual(THPrompt.parseDuration('שעה ו-45'), 105);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה ושלושים, כוח'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון שעה וארבעים לרגליים'), 100);
  assert.strictEqual(THPrompt.parseDuration('שעה ועשרים וחמש'), 85);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעתיים ועשרים'), 140);
  assert.strictEqual(THPrompt.parseDuration('2 שעות ועשרים'), 140);
});

test('a count after «שעה ו» is not minutes', () => {
  assert.notStrictEqual(THPrompt.parseDuration('אימון של שעה ו-5 תרגילים'), 65);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה וחצי'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה ועשר דקות'), 70);
});
