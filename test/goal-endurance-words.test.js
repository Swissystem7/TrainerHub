const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('both spellings of endurance are the endurance goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון סיבולת רגליים 30 דקות'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('סבולת שריר לחניכים'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('מטרה: סבולת'), 'endurance');
});

test('aerobic / cardio prompts ask for the endurance stimulus', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון אירובי 20 דקות'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('קרדיו בלי ציוד'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('cardio full body'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('muscular endurance for the legs'), 'endurance');
});

test('strength and hypertrophy still win over an endurance word', () => {
  assert.strictEqual(THPrompt.parseGoal('כוח וסבולת'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('מסת שריר וקצת אירובי'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('אימון בטן 20 דקות'), null);
});

test('parsePrompt carries the endurance goal into the request', () => {
  const req = THPrompt.parsePrompt('אימון סבולת גב 30 דקות לשמונה חניכים');
  assert.strictEqual(req.goal, 'endurance');
  assert.strictEqual(req.duration, 30);
  assert.strictEqual(req.participants, 8);
  assert.ok(req.muscles.indexOf('back') !== -1);
});
