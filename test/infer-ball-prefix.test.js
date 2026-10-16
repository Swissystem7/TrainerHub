const test = require('node:test');
const assert = require('node:assert');
const { inferEquipment } = require('../js/infer.js');
const { parseEquipment } = require('../js/prompt-parser.js');

test('inferEquipment reads a ball with a prefix or in the plural', function () {
  assert.deepStrictEqual(inferEquipment('שליטה בכדור'), ['ball']);
  assert.deepStrictEqual(inferEquipment('מסירות עם הכדור'), ['ball']);
  assert.deepStrictEqual(inferEquipment('תחנות עם כדורים'), ['ball']);
  assert.deepStrictEqual(inferEquipment('זריקות לכדור, 3 סבבים'), ['ball']);
});

test('inferEquipment still tells ball sports from a ball', function () {
  assert.deepStrictEqual(inferEquipment('בכדורסל'), ['basketball']);
  assert.deepStrictEqual(inferEquipment('משחק כדורגל'), ['football']);
  assert.deepStrictEqual(inferEquipment('כדורעף'), ['none']);
  assert.deepStrictEqual(inferEquipment('כדור טניס'), ['tennis-ball']);
});

test('«בלי כדורים» rules the gear out like «בלי משקולות»', function () {
  assert.deepStrictEqual(parseEquipment('אימון רגליים בלי כדורים'), ['none']);
  assert.deepStrictEqual(parseEquipment('אימון שליטה בכדור לילדים'), ['ball']);
});
