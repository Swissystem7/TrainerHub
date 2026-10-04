const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('parseParticipants returns 2 when the input text contains the word couple in Hebrew.', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון לזוג'), 2);
});
