'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון רגליים ובטן» was titled «אימון ליבה»: the focus went to whichever
// muscle came first in MUSCLE_KEYS (core), not to the one the trainer named
// first.

test('the muscle named first is the focus', function () {
  assert.equal(Prompt.parsePrompt('אימון רגליים ובטן').focus, 'legs');
  assert.equal(Prompt.parsePrompt('אימון לא רק רגליים, גם בטן').focus, 'legs');
  assert.equal(Prompt.parsePrompt('אימון ידיים וגב').focus, 'arms');
  assert.equal(Prompt.parsePrompt('אימון כתפיים וחזה').focus, 'shoulders');
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים ובטן').muscles, ['legs', 'core']);
});

test('the session title follows the first muscle', function () {
  assert.equal(buildSession('אימון רגליים ובטן 20 דקות', catalog).workout.title.indexOf('אימון רגליים'), 0);
  assert.equal(buildSession('אימון בטן ורגליים 20 דקות', catalog).workout.title.indexOf('אימון ליבה'), 0);
});

test('single muscles and body halves are unchanged', function () {
  assert.equal(Prompt.parsePrompt('אימון בטן').focus, 'core');
  assert.equal(Prompt.parsePrompt('אימון גב').focus, 'back');
  assert.equal(Prompt.parsePrompt('אימון פלג גוף עליון ובטן').focus, 'upper');
  assert.equal(Prompt.parsePrompt('אימון גוף מלא').focus, 'full');
});
