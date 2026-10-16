const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "חימום עשר דקות, אימון חצי שעה" was a 10-minute session and
// "אימון חצי שעה עם 5 דקות מנוחה" a 5-minute one: only digit minutes were
// checked for a warm-up / rest tie, and a tied amount still beat the hour phrase.
test('word minutes tied to a warm-up or rest word are not the session length', () => {
  assert.strictEqual(THPrompt.parseDuration('חימום חמש דקות ואז עשרים דקות אימון'), 20);
  assert.strictEqual(THPrompt.parseDuration('עשר דקות מתיחות, ריצה עשרים דקות'), 20);
  assert.strictEqual(THPrompt.parseDuration('עשרים דקות אימון ו-5 דקות מנוחה'), 20);
});

test('an hour phrase beats minutes that belong to a warm-up or rest', () => {
  assert.strictEqual(THPrompt.parseDuration('חימום עשר דקות, אימון חצי שעה'), 30);
  assert.strictEqual(THPrompt.parseDuration('חימום 10 דקות, אימון חצי שעה'), 30);
  assert.strictEqual(THPrompt.parseDuration('אימון חצי שעה עם 5 דקות מנוחה'), 30);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה כולל 10 דקות חימום'), 60);
});

test('untied word minutes and a lone part length still count', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של עשר דקות'), 10);
  assert.strictEqual(THPrompt.parseDuration('חמש עשרה דקות'), 15);
  assert.strictEqual(THPrompt.parseDuration('ארבעים וחמש דקות ריצה'), 45);
  assert.strictEqual(THPrompt.parseDuration('חימום עשר דקות'), 10);
  assert.strictEqual(THPrompt.parseDuration('כמה דקות'), null);
});
