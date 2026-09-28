const test = require('node:test');
const assert = require('node:assert');
const { inferEquipment } = require('../js/infer.js');

test('inferEquipment identifies kettlebell from Hebrew text', function () {
  var result = inferEquipment('סווינג עם קטלבלס');
  assert.deepStrictEqual(result, ['kettlebell']);
});
