const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('HIIT written in Hebrew («היט» / «הייט») asks for the endurance stimulus', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון היט 20 דקות'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון הייט לרגליים'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון בסגנון היט'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('אימון רגליים והיט'), 'endurance');
});

test('«היטב» is not HIIT', () => {
  assert.strictEqual(THPrompt.parseGoal('לבצע היטב אימון רגליים'), null);
});

test('a negated «היט» is not a goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון רגליים, בלי היט'), null);
  assert.strictEqual(THPrompt.parseGoal('אימון כוח, לא היט'), 'strength');
});

test('parsePrompt carries the Hebrew HIIT goal into the request', () => {
  const req = THPrompt.parsePrompt('אימון היט לרגליים 20 דקות');
  assert.strictEqual(req.goal, 'endurance');
  assert.strictEqual(req.focus, 'legs');
  assert.strictEqual(req.duration, 20);
});
