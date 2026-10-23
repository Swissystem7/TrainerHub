const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

const audience = (s) => THPrompt.parsePrompt(s).audience;

test('a negated audience word is not the audience', () => {
  assert.strictEqual(audience('אימון לבד בלי פרטנר'), '');
  assert.strictEqual(audience('אימון כוח, לא לילדים'), '');
  assert.strictEqual(audience('אימון יחידני, לא בזוגות'), '');
  assert.strictEqual(audience('אימון ללא זוגות וילדים'), '');
});

test('sports gear is not a sport audience', () => {
  assert.strictEqual(audience('אימון ללא ציוד ספורט'), '');
  assert.strictEqual(audience('אימון בנעלי ספורט בפארק'), '');
  assert.strictEqual(audience('אימון באולם הספורט'), '');
});

test('a named audience is still detected', () => {
  assert.strictEqual(audience('אימון לילדים'), 'kids');
  assert.strictEqual(audience('אימון בזוגות'), 'partner');
  assert.strictEqual(audience('אימון לשחקני כדורגל'), 'sport');
  assert.strictEqual(audience('אימון לילדים בלי ציוד'), 'kids');
  assert.strictEqual(audience('אימון עם פרטנר, לא לילדים'), 'partner');
});
