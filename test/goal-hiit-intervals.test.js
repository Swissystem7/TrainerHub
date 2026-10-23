const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('HIIT / Tabata / interval prompts ask for the endurance stimulus', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון HIIT 20 דקות'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('hiit workout'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון טבטה'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון טבאטה לרגליים'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('Tabata full body'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון אינטרוולים בפארק'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('interval training'), 'endurance');
});

test('a negated HIIT / Tabata word is not a goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון בלי HIIT'), null);
  assert.strictEqual(THPrompt.parseGoal('לא טבטה, משהו רגוע'), null);
  assert.strictEqual(THPrompt.parseGoal('אימון כוח לא HIIT'), 'strength');
});

test('strength and hypertrophy still win over an interval word', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון כוח בסגנון טבטה'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('אימון למסה עם אינטרוולים'), 'hypertrophy');
});

test('parsePrompt carries the HIIT goal into the request', () => {
  const req = THPrompt.parsePrompt('אימון HIIT לרגליים 20 דקות');
  assert.strictEqual(req.goal, 'endurance');
  assert.strictEqual(req.duration, 20);
});
