'use strict';

// «אימון רגליים עם משקולות»: the catalog has no dumbbell clips, so the
// engine relaxes the equipment filter and builds the plan from band and ball
// drills. The workout's equipment list (the «ציוד» pill and the client share
// link) and the type line still said «משקולות».

const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/core.js');
const Engine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

test('relaxed equipment lists the gear the plan actually uses', function () {
  const r = Engine.buildSession('אימון רגליים עם משקולות', catalog);
  assert.equal(r.closest, true);
  assert.ok(r.notice.indexOf('משקולות') !== -1, 'notice still names what was asked');
  assert.ok(r.workout.equipment.indexOf('משקולות') === -1, r.workout.equipment.join(','));
  assert.ok(r.workout.equipment.length > 0);
  assert.ok(r.explanation.type.indexOf('משקולות') === -1, r.explanation.type);
});

test('equipment that was found stays as asked', function () {
  const r = Engine.buildSession('אימון רגליים עם גומיות', catalog);
  assert.deepEqual(r.workout.equipment, ['גומיות']);
  assert.ok(r.explanation.type.indexOf('גומיות') !== -1, r.explanation.type);
});
