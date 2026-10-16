'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון בלי רגליים» names no muscle to train, so it falls back to full body.
// It used to fill that full-body session with leg clips anyway
// («גומיות ארבע ראשי»), since nothing remembered the muscle that was ruled out.

function mainMuscles(text) {
  const byId = catalog;
  const main = buildSession(text, catalog).workout.phases.find(p => p.name === 'Main');
  return main.exercises.map(x => (byId[x.id].muscles || [])[0]);
}

test('the ruled-out muscles are reported', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון בלי רגליים').excludedMuscles, ['legs']);
  assert.deepEqual(Prompt.parsePrompt('אימון ללא רגליים ובטן').excludedMuscles, ['core', 'legs']);
  assert.deepEqual(Prompt.parsePrompt('אימון בלי ידיים').excludedMuscles, ['biceps', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים').excludedMuscles, []);
  assert.deepEqual(Prompt.parsePrompt('אימון בלי משקולות').excludedMuscles, []);
});

test('«אימון בלי רגליים» has no leg clip in the main phase', function () {
  const req = Prompt.parsePrompt('אימון בלי רגליים 30 דקות');
  assert.equal(req.focus, 'full');
  const muscles = mainMuscles('אימון בלי רגליים 30 דקות');
  assert.ok(muscles.length >= 3);
  assert.equal(muscles.indexOf('legs'), -1);
  assert.equal(mainMuscles('אימון גוף מלא בלי רגליים').indexOf('legs'), -1);
  assert.equal(mainMuscles('אימון ללא בטן').indexOf('core'), -1);
  assert.equal(mainMuscles('אימון בלי ידיים').indexOf('biceps'), -1);
});

test('unchanged: «אימון רגליים» and «אימון גוף מלא»', function () {
  assert.equal(mainMuscles('אימון רגליים').every(m => m === 'legs'), true);
  assert.notEqual(mainMuscles('אימון גוף מלא 30 דקות').indexOf('legs'), -1);
});
