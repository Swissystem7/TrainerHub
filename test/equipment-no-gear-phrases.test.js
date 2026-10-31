const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');
const THEngine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «בלי שום ציוד» was a no-gear request but «ללא שום ציוד», «בלי אביזרים»
// and «במשקל הגוף» were not: they gave no equipment filter at all.
test('every way of saying "no equipment" asks for bodyweight', () => {
  [
    'אימון רגליים ללא שום ציוד',
    'אימון רגליים בלי אביזרים',
    'אימון רגליים ללא אביזרים',
    'אימון בלי שום אביזר',
    'אימון במשקל הגוף',
    'אימון בלי ציוד',
    'אימון ללא ציוד',
    'אימון בלי שום ציוד',
    'אימון עם משקל גוף'
  ].forEach((t) => {
    assert.deepStrictEqual(THPrompt.parseEquipment(t), ['none'], t);
  });
});

test('gear that is asked for is still gear', () => {
  assert.deepStrictEqual(THPrompt.parseEquipment('אימון רגליים עם גומיות'), ['band']);
  assert.deepStrictEqual(THPrompt.parseEquipment('אימון במכון'), ['machine']);
  assert.deepStrictEqual(THPrompt.parseEquipment('אימון רגליים'), []);
});

test('«ללא שום ציוד» builds no band or ball drills', () => {
  const r = THEngine.buildSession('אימון רגליים ללא שום ציוד 30 דקות', catalog);
  r.workout.phases[1].exercises.forEach((ex) => {
    const gear = (catalog[ex.id] && catalog[ex.id].equipment) || ['none'];
    assert.ok(gear.indexOf('none') !== -1 || gear.indexOf('wall') !== -1, ex.name + ' ' + gear);
  });
});
