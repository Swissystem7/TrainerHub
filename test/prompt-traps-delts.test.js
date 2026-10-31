'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון טרפז» / «אימון שכמות» / «אימון דלתא» named no muscle the parser knew,
// so they came back as full-body sessions.

test('traps, shoulder blades and lats are back sessions', function () {
  assert.equal(Prompt.parsePrompt('אימון טרפז').focus, 'back');
  assert.equal(Prompt.parsePrompt('אימון שכמות').focus, 'back');
  assert.equal(Prompt.parsePrompt('אימון לאטים').focus, 'back');
  assert.deepEqual(Prompt.parsePrompt('אימון טרפז').muscles, ['back']);
});

test('deltoids are a shoulder session', function () {
  assert.equal(Prompt.parsePrompt('אימון דלתא').focus, 'shoulders');
  assert.equal(Prompt.parsePrompt('אימון דלתואיד').focus, 'shoulders');
});

test('the session title follows the muscle', function () {
  assert.equal(buildSession('אימון טרפז 20 דקות', catalog).workout.title.indexOf('אימון גב'), 0);
  assert.equal(buildSession('אימון דלתא 20 דקות', catalog).workout.title.indexOf('אימון כתפיים'), 0);
});

test('ruling them out excludes the muscle', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים בלי טרפז').excludedMuscles, ['back']);
});
