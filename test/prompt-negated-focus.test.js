'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «לא לרגליים» rules the legs out. It used to be read as a leg request:
// «אימון לא לרגליים, רק ידיים» came back as a leg session with arms added.

test('"לא/בלי/ללא <muscle>" is not a request for that muscle', function () {
  const notLegs = Prompt.parsePrompt('אימון לא לרגליים, רק ידיים');
  assert.equal(notLegs.focus, 'arms');
  assert.deepEqual(notLegs.muscles, ['biceps', 'triceps']);
  assert.equal(Prompt.parsePrompt('אימון ידיים בלי רגליים').focus, 'arms');
  assert.deepEqual(Prompt.parsePrompt('אימון גב וחזה, בלי בטן').muscles, ['back', 'chest']);
  assert.deepEqual(Prompt.parsePrompt('אימון ללא רגליים ובטן, רק כתפיים').muscles, ['shoulders']);
});

test('unchanged: plain muscles and negated non-muscle words', function () {
  assert.equal(Prompt.parsePrompt('אימון רגליים').focus, 'legs');
  assert.equal(Prompt.parsePrompt('לא יותר מ 20 דקות רגליים').focus, 'legs');
  assert.equal(Prompt.parsePrompt('אימון בלי משקולות לגב').focus, 'back');
  assert.deepEqual(Prompt.parsePrompt('אימון בלי משקולות לגב').equipment, ['none']);
});

test('«אימון לא לרגליים, רק ידיים» builds the same session as «אימון ידיים»', function () {
  const notLegs = buildSession('אימון לא לרגליים, רק ידיים', catalog);
  const arms = buildSession('אימון ידיים', catalog);
  assert.deepEqual(
    notLegs.workout.phases.map(p => p.exercises.map(e => e.id)),
    arms.workout.phases.map(p => p.exercises.map(e => e.id))
  );
});
