const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('parseDuration extracts 90 minutes from שעה וחצי', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה וחצי'), 90);
});
