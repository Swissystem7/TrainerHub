const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('"בינוני" in all its forms is the intermediate level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון רגליים רמה בינונית'), 'intermediate');
  assert.strictEqual(THPrompt.parseLevel('חניכים בינוניים 30 דקות'), 'intermediate');
  assert.strictEqual(THPrompt.parseLevel('קבוצה בינונית של חניכות'), 'intermediate');
  assert.strictEqual(THPrompt.parseLevel('מתאמן בינוני'), 'intermediate');
  assert.strictEqual(THPrompt.parseLevel('רמת ביניים'), 'intermediate');
});

test('a medium pace, load or rest is not a trainee level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון בטן בקצב בינוני'), null);
  assert.strictEqual(THPrompt.parseLevel('רגליים עם משקל בינוני'), null);
  assert.strictEqual(THPrompt.parseLevel('עצימות בינונית 20 דקות'), null);
  assert.strictEqual(THPrompt.parseLevel('חזה עם מנוחה בינונית'), null);
});

test('explicit beginner / advanced still win', () => {
  assert.strictEqual(THPrompt.parseLevel('קבוצה מתקדמת בקצב בינוני'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('אימון למתחילים'), 'beginner');
});

test('parsePrompt carries the level into the request', () => {
  const req = THPrompt.parsePrompt('אימון גב 30 דקות לחניכים ברמה בינונית');
  assert.strictEqual(req.level, 'intermediate');
  assert.strictEqual(req.duration, 30);
});
