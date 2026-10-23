const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "3 סבבים של 5 דקות" was a 5-minute session: parseDuration took the length of
// one round as the whole workout.
test('rounds of N minutes are the rounds times the round length', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של 3 סבבים של 5 דקות'), 15);
  assert.strictEqual(THPrompt.parseDuration('3 סבבים ל-5 דקות'), 15);
  assert.strictEqual(THPrompt.parseDuration('אימון 4 סיבובים של 8 דקות'), 32);
  assert.strictEqual(THPrompt.parseDuration('שלושה סבבים של חמש דקות'), 15);
});

test('a stated session length still wins over the round length', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון 30 דקות, 3 סבבים של 5 דקות'), 30);
  assert.strictEqual(THPrompt.parseDuration('3 סבבים של 5 דקות, אימון של 30 דקות'), 30);
  assert.strictEqual(THPrompt.parseDuration('אימון שעה, 4 סבבים של 10 דקות'), 60);
  assert.strictEqual(THPrompt.parseDuration('אימון 3 סבבים, 40 דקות'), 40);
});

test('parsePrompt carries the rounds total through', () => {
  assert.strictEqual(THPrompt.parsePrompt('אימון רגליים, 3 סבבים של 10 דקות').duration, 30);
});
