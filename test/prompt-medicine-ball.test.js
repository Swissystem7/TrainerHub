'use strict';
// «כדור כוח» is a medicine ball. parseGoal matched the «כוח» inside it, so
// «אימון עם כדור כוח» became a strength session and even «אימון סיבולת עם
// כדור כוח» lost its endurance goal.
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

function goal(text) {
  return Prompt.parsePrompt(text).goal;
}

test('a medicine ball is gear, not a strength goal', () => {
  for (const text of ['אימון עם כדור כוח', 'אימון 20 דקות עם כדורי כוח', 'אימון עם כדור כח']) {
    assert.equal(goal(text), null, text);
    assert.deepEqual(Prompt.parsePrompt(text).equipment, ['ball'], text);
  }
  assert.equal(goal('אימון סיבולת עם כדור כוח'), 'endurance');
});

test('a strength goal next to a medicine ball is still strength', () => {
  assert.equal(goal('אימון כוח עם כדור כוח'), 'strength');
  assert.equal(goal('אימון כוח'), 'strength');
  assert.equal(goal('אימון כח לרגליים'), 'strength');
});
