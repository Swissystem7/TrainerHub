const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('«חיזוק» next to «כוח» keeps the strength goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון כוח וחיזוק ליבה'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('אימון כוח לרגליים עם חיזוק לברכיים'), 'strength');
  assert.strictEqual(THPrompt.parseGoal('חיזוק שרירי הגב, אימון כוח'), 'strength');
  assert.strictEqual(THPrompt.parsePrompt('אימון כוח וחיזוק ליבה 30 דקות').goal, 'strength');
});

test('«חיזוק» alone, or a negated «כוח», still sets no strength goal', () => {
  assert.strictEqual(THPrompt.parseGoal('אימון חיזוק'), null);
  assert.strictEqual(THPrompt.parseGoal('חיזוק ליבה, לא כוח'), null);
  assert.strictEqual(THPrompt.parseGoal('חיזוק כח לגב'), 'strength');
});
