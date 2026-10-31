const test = require('node:test');
const assert = require('node:assert');
const { inferEquipment } = require('../js/infer.js');
const { parsePrompt } = require('../js/prompt-parser.js');

test('«רצועות התנגדות» are resistance bands', function () {
  assert.deepStrictEqual(inferEquipment('חתירה עם רצועת התנגדות'), ['band']);
  assert.deepStrictEqual(inferEquipment('סקוואט עם רצועה התנגדות'), ['band']);
  assert.deepStrictEqual(inferEquipment('lateral walk with resistance band'), ['band']);
});

test('a prompt with «רצועות התנגדות» asks for band clips', function () {
  assert.deepStrictEqual(parsePrompt('אימון רגליים עם רצועות התנגדות').equipment, ['band']);
});

test('a strap that is not a resistance band stays out', function () {
  assert.deepStrictEqual(inferEquipment('חתירה ברצועות TRX'), ['none']);
});
