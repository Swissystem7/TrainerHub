const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// «3 רבעי שעה» fell to the 20-minute default, and «שעה ושלושת רבעי» (an hour and
// 45 minutes) did too; «שעה ושלושת רבעי שעה» read only its trailing 45.
test('parseDuration reads three quarters written with a digit', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של 3 רבעי שעה'), 45);
  assert.strictEqual(THPrompt.parsePrompt('אימון של 3 רבעי שעה').durationSpecified, true);
  assert.strictEqual(THPrompt.parseDuration('שלושת רבעי שעה'), 45);
  assert.strictEqual(THPrompt.parseDuration('3/4 שעה'), 45);
});

test('parseDuration adds three quarters after an hour', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה ושלושת רבעי'), 105);
  assert.strictEqual(THPrompt.parseDuration('שעה ושלושת רבעי שעה'), 105);
  assert.strictEqual(THPrompt.parseDuration('שעה ו-3 רבעי שעה'), 105);
  assert.strictEqual(THPrompt.parseDuration('שעתיים ושלושת רבעי'), 165);
});

test('other quarter and hour phrases keep their minutes', () => {
  assert.strictEqual(THPrompt.parseDuration('רבע שעה'), 15);
  assert.strictEqual(THPrompt.parseDuration('שעה ורבע'), 75);
  assert.strictEqual(THPrompt.parseDuration('שעה'), 60);
  assert.strictEqual(THPrompt.parseDuration('13 רבעי שעה'), null);
});
