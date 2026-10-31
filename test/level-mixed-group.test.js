const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('a group of beginners and advanced trainees has no single level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון למתאמנים מתחילים ומתקדמים'), null);
  assert.strictEqual(THPrompt.parseLevel('קבוצה מעורבת של מתחילים ומתקדמים'), null);
  assert.strictEqual(THPrompt.parseLevel('אימון למתחילים, ביניים ומתקדמים'), null);
  assert.strictEqual(THPrompt.parseLevel('חניכים בינוניים ומתקדמים'), null);
});

test('the full prompt of a mixed group carries no level', () => {
  assert.strictEqual(THPrompt.parsePrompt('אימון רגליים 30 דקות למתחילים ומתקדמים').level, null);
});

test('one named level, or one ruled out, still decides', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון למתקדמים'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('אימון למתחילים ולא למתקדמים'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון למתחילים בקצב בינוני'), 'beginner');
});
