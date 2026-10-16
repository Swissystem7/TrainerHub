'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «בלי משקולות» rules the dumbbells out. It used to be read as a dumbbell
// request: the builder said there are not enough clips for «רגליים · משקולות»
// and filled the session with band and football drills.

test('"בלי X" / "ללא X" is not a request for X', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים בלי משקולות').equipment, ['none']);
  assert.deepEqual(Prompt.parsePrompt('אימון ללא גומיות ומשקולות').equipment, ['none']);
  assert.deepEqual(Prompt.parsePrompt('אימון בלי שום משקולות').equipment, ['none']);
});

test('the gear that is asked for still counts next to a negated one', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון בלי משקולות, עם גומיות').equipment, ['band']);
  assert.deepEqual(Prompt.parsePrompt('אימון עם קטלבל בלי משקולות').equipment, ['kettlebell']);
});

test('unchanged: plain gear, «ללא ציוד», and a negated non-gear word', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון עם משקולות').equipment, ['dumbbells']);
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים ללא ציוד').equipment, ['none']);
  assert.deepEqual(Prompt.parsePrompt('אימון בלי ריצה, רגליים').equipment, []);
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים').equipment, []);
});

test('«אימון רגליים בלי משקולות» builds the same session as «ללא ציוד»', function () {
  const without = buildSession('אימון רגליים בלי משקולות', catalog);
  const none = buildSession('אימון רגליים ללא ציוד', catalog);
  assert.equal(without.satisfied, true, without.notice);
  assert.deepEqual(
    without.workout.phases.map(p => p.exercises.map(e => e.id)),
    none.workout.phases.map(p => p.exercises.map(e => e.id))
  );
});
