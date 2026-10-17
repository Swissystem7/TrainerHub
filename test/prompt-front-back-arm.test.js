'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון יד אחורית» was an arms session (biceps + triceps): the word «יד»
// matched the arms group and «אחורית» / «קדמית» were never read, so the
// trainer who asked for triceps got a «אימון ידיים» with biceps in it.

test('«יד קדמית» is the biceps and «יד אחורית» is the triceps', function () {
  const front = Prompt.parsePrompt('אימון יד קדמית 20 דקות');
  assert.deepEqual(front.muscles, ['biceps']);
  assert.equal(front.focus, 'biceps');
  const back = Prompt.parsePrompt('אימון יד אחורית עם משקולות');
  assert.deepEqual(back.muscles, ['triceps']);
  assert.equal(back.focus, 'triceps');
  assert.deepEqual(Prompt.parsePrompt('אימון חזה ויד אחורית').muscles, ['chest', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון יד קדמית ויד אחורית').muscles, ['biceps', 'triceps']);
});

test('the session is titled for the one muscle', function () {
  assert.equal(buildSession('אימון יד אחורית 20 דקות', catalog).workout.title.indexOf('אימון תלת־ראשי'), 0);
  assert.equal(buildSession('אימון יד קדמית 20 דקות', catalog).workout.title.indexOf('אימון דו־ראשי'), 0);
});

test('«ידיים» / «יד» alone are still both arms', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון ידיים').muscles, ['biceps', 'triceps']);
  assert.equal(Prompt.parsePrompt('אימון יד').focus, 'arms');
  assert.deepEqual(Prompt.parsePrompt('אימון בעמידה לגב').muscles, ['back']);
});
