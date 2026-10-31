'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

// «אימון יד קדמית ואחורית» was a biceps-only session: the second «יד» is
// left out, so «ואחורית» never matched «יד אחורית» and the triceps the
// trainer asked for were dropped.

test('«יד קדמית ואחורית» is biceps and triceps', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון יד קדמית ואחורית').muscles, ['biceps', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון יד הקדמית והאחורית').muscles, ['biceps', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון גב ויד קדמית ואחורית').muscles, ['back', 'biceps', 'triceps']);
});

test('the head named first leads', function () {
  const r = Prompt.parsePrompt('אימון יד אחורית וקדמית');
  assert.deepEqual(r.muscles, ['triceps', 'biceps']);
  assert.equal(r.focus, 'triceps');
});

test('one head alone is still one head', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון יד קדמית ובטן').muscles, ['biceps', 'core']);
  assert.deepEqual(Prompt.parsePrompt('אימון חזה ויד אחורית').muscles, ['chest', 'triceps']);
});
