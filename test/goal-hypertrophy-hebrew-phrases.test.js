const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('«בניית שריר» / «הגדלת שריר» is the hypertrophy goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון לבניית שריר'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('בניית שרירים לחזה, 40 דקות'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('אימון לבנית שריר'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('הגדלת שרירי רגליים'), 'hypertrophy');
});

test('«מסה» as a word is the hypertrophy goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון למסה'), 'hypertrophy');
  assert.strictEqual(THPrompt.parseGoal('אימון מסה לגב'), 'hypertrophy');
});

test('«מסה» inside another word, or negated, is not', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון במסלול ריצה'), null);
  assert.strictEqual(THPrompt.parseGoal('אימון סיבולת, לא מסה'), 'endurance');
  assert.strictEqual(THPrompt.parseGoal('קרדיו בלי בניית שריר'), 'endurance');
});

test('parsePrompt carries the goal into the request', () => {
  assert.strictEqual(THPrompt.parsePrompt('אימון לבניית שריר לרגליים 30 דקות').goal, 'hypertrophy');
});
