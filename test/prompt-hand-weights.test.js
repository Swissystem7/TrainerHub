'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון עם משקולות יד» was an arms session: «יד» matched the arms group, so
// a trainer who only named the gear (hand weights = dumbbells) got biceps and
// triceps instead of a full-body session.

test('«משקולות יד» is dumbbells, not an arm session', function () {
  const r = Prompt.parsePrompt('אימון עם משקולות יד');
  assert.deepEqual(r.muscles, []);
  assert.equal(r.focus, 'full');
  assert.deepEqual(r.equipment, ['dumbbells']);
  assert.deepEqual(Prompt.parsePrompt('אימון 30 דקות עם משקולת יד').muscles, []);
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים עם משקולות יד').muscles, ['legs']);
});

test('«בלי משקולות יד» does not rule the arms out', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון בלי משקולות יד').excludedMuscles, []);
});

test('the session is not titled as an arm session', function () {
  assert.equal(buildSession('אימון עם משקולות יד', catalog).workout.title.indexOf('אימון ידיים'), -1);
});

test('«יד» and «ידיים» are still the arms', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון יד עם משקולות').muscles, ['biceps', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון ידיים עם משקולות').muscles, ['biceps', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון יד אחורית עם משקולות').muscles, ['triceps']);
});
