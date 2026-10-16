const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "חימום 10 דקות ואז 30 דקות אימון" was a 10-minute session and
// "מנוחה 2 דקות, אימון 30 דקות" a 2-minute one: parseDuration took the first
// "N דקות" in the text, even when it was the warm-up's or the rest's length.
test('minutes tied to a warm-up, rest or stretch word are not the session length', () => {
  assert.strictEqual(THPrompt.parseDuration('חימום 10 דקות ואז 30 דקות אימון'), 30);
  assert.strictEqual(THPrompt.parseDuration('10 דקות חימום ו-30 דקות אימון כוח'), 30);
  assert.strictEqual(THPrompt.parseDuration('מנוחה 2 דקות, אימון 30 דקות'), 30);
  assert.strictEqual(THPrompt.parseDuration('5 דקות מתיחות בסוף, אימון 30 דקות'), 30);
  assert.strictEqual(THPrompt.parseDuration('אימון רגליים עם 5 דקות חימום, 40 דקות'), 40);
});

test('the session length still wins when it comes first, and a lone part length still counts', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון 45 דקות כולל 10 דקות חימום'), 45);
  assert.strictEqual(THPrompt.parseDuration('אימון 30 דקות עם מנוחה 2 דקות בין סבבים'), 30);
  assert.strictEqual(THPrompt.parseDuration('אימון בטן 20 דקות'), 20);
  assert.strictEqual(THPrompt.parseDuration('חימום 10 דקות'), 10);
});

test('parsePrompt carries the session length through', () => {
  const r = THPrompt.parsePrompt('אימון רגליים, חימום 10 דקות ואז 30 דקות אימון');
  assert.strictEqual(r.duration, 30);
  assert.strictEqual(r.durationSpecified, true);
});
