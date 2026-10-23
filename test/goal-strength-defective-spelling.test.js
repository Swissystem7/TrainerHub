const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('«כח» without the vav is the strength goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון כח לרגליים'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('כח מתפרץ, 30 דקות'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('אימון לכח'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('חיזוק כח לגב'), 'strength');
});

test('«לא כח» rules strength out like «לא כוח»', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון סיבולת, לא כח'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('בלי כח, רק מתיחות'), null);
});

test('words that only contain «כח» are not a strength goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון עם נוכחות של 10 חניכים'), null);
  assert.strictEqual(THPrompt.parseGoal('מי ששוכח מים יביא'), null);
});

test('parsePrompt carries the strength goal into the request', () => {
  const req = THPrompt.parsePrompt('אימון כח לרגליים 40 דקות');
  assert.strictEqual(req.goal, 'strength');
  assert.strictEqual(req.duration, 40);
  assert.ok(req.muscles.indexOf('legs') !== -1);
});
