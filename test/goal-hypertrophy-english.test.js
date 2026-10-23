const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('English «hypertrophy» is the hypertrophy goal', () => {
  assert.strictEqual(THPrompt.parseGoal('hypertrophy workout'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('Hypertrophy legs 30 min'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('אימון hypertrophy לחזה'), 'hypertrophy');
});

test('«not hypertrophy» rules hypertrophy out', () => {
  assert.strictEqual(THPrompt.parseGoal('endurance, not hypertrophy'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון סיבולת, לא hypertrophy'), 'endurance');
});

test('parsePrompt carries the hypertrophy goal into the request', () => {
  const req = THPrompt.parsePrompt('hypertrophy legs 40 min');
  assert.strictEqual(req.goal, 'hypertrophy');
});
