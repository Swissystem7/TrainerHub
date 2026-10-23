const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

const participants = (s) => THPrompt.parsePrompt(s).participants;

test('a negated pair is not a couple', () => {
  assert.strictEqual(participants('אימון יחידני, לא בזוגות'), 1);
  assert.strictEqual(participants('אימון בלי זוגות'), 1);
  assert.strictEqual(participants('אימון ללא זוגות וילדים'), 1);
});

test('a named pair is still a couple', () => {
  assert.strictEqual(participants('אימון בזוגות'), 2);
  assert.strictEqual(participants('אימון לזוג'), 2);
  assert.strictEqual(participants('אימון בזוגות, לא לילדים'), 2);
  assert.strictEqual(participants('20 חניכים, לא בזוגות'), 20);
});
