'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

// «בלי מוט מתח» rules the pull-up bar out. The negation took one word, so
// «מתח» was left behind: the prompt asked for the bar and added a back and
// biceps session to «אימון רגליים בלי מוט מתח».

test('«בלי מוט מתח» / «בלי עליות מתח» is not a pull-up bar request', function () {
  const legs = Prompt.parsePrompt('אימון רגליים בלי מוט מתח');
  assert.deepEqual(legs.equipment, ['none']);
  assert.deepEqual(legs.muscles, ['legs']);
  assert.equal(legs.focus, 'legs');

  const reps = Prompt.parsePrompt('אימון רגליים בלי עליות מתח');
  assert.deepEqual(reps.equipment, ['none']);
  assert.deepEqual(reps.muscles, ['legs']);

  const bare = Prompt.parsePrompt('אימון בלי מוט מתח');
  assert.deepEqual(bare.equipment, ['none']);
  assert.deepEqual(bare.muscles, []);
  assert.equal(bare.focus, 'full');
});

test('the gear asked for next to it still counts', function () {
  const p = Prompt.parsePrompt('אימון חזה בלי מוט מתח ועם משקולות');
  assert.deepEqual(p.equipment, ['dumbbells']);
  assert.deepEqual(p.muscles, ['chest']);
});

test('unchanged: a pull-up bar that is asked for', function () {
  const p = Prompt.parsePrompt('אימון עם מוט מתח');
  assert.deepEqual(p.equipment, ['bar']);
  assert.deepEqual(p.muscles, ['back', 'biceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון גב בלי מתח').muscles, ['back']);
});
