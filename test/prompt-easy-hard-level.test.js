const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('"אימון קשה" is an advanced session', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון קשה לרגליים'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('אימון רגליים קשה, 30 דקות'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('אימון קשה במיוחד'), 'advanced');
});

test('"אימון קל" / "אימון קליל" is a beginner session', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון קל של 20 דקות'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון בטן קל'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון קצר וקליל'), 'beginner');
});

test('a light drill, a light load or a negated hard session is not a level', () => {
  assert.strictEqual(THPrompt.parseLevel('ריצה קלה 5 דקות'), null);
  assert.strictEqual(THPrompt.parseLevel('אימון עם משקל קל'), null);
  assert.strictEqual(THPrompt.parseLevel('אימון לא קשה'), null);
  assert.strictEqual(THPrompt.parseLevel('אימון קלאסי לגב'), null);
});

test('explicit level words still win', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון קשה למתחילים'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון קל למתקדמים'), 'advanced');
});

test('parsePrompt carries the level into the request', () => {
  const req = THPrompt.parsePrompt('אימון גב קשה 30 דקות');
  assert.strictEqual(req.level, 'advanced');
  assert.deepStrictEqual(req.muscles, ['back']);
});
