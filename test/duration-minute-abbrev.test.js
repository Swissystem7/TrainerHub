const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// «40 ד׳» / «40 ד'» is the usual short form of «40 דקות». fold() drops the
// geresh, the minute regexes wanted «דק», and the prompt fell to the
// 20-minute default; after an hour «שעה ו-15 ד׳» read as 15.
test('parseDuration reads «N ד׳» as minutes', () => {
  assert.strictEqual(THPrompt.parseDuration("אימון 40 ד'"), 40);
  assert.strictEqual(THPrompt.parseDuration('אימון 40 ד׳'), 40);
  assert.strictEqual(THPrompt.parseDuration("45ד' רגליים"), 45);
  assert.strictEqual(THPrompt.parseDuration("אימון בטן 25 ד', 3 סטים"), 25);
});

test('parseDuration adds «ד׳» minutes to the hour', () => {
  assert.strictEqual(THPrompt.parseDuration("שעה ו-15 ד'"), 75);
  assert.strictEqual(THPrompt.parseDuration('שעתיים ו-10 ד׳'), 130);
  assert.strictEqual(THPrompt.parseDuration("2 שעות ו-20 ד'"), 140);
});

test('a «ד׳» warm-up is still a tied part, not the session length', () => {
  assert.strictEqual(THPrompt.parseDuration("חימום 10 ד' ואז 30 ד' אימון"), 30);
});

test('a ד that starts a word is not minutes', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון ל-5 דוגמניות'), null);
  assert.strictEqual(THPrompt.parseDuration('45 דקות גב'), 45);
  assert.strictEqual(THPrompt.parseDuration('30 דק׳'), 30);
});

test('parsePrompt carries the «ד׳» length through', () => {
  const p = THPrompt.parsePrompt("אימון רגליים 40 ד' בלי ציוד");
  assert.strictEqual(p.duration, 40);
  assert.strictEqual(p.durationSpecified, true);
});
