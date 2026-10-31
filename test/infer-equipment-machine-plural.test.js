const test = require('node:test');
const assert = require('node:assert');
const { inferEquipment } = require('../js/infer.js');

test('«מכונות» and «מכונת ...» are machine work, not «משקל גוף»', function () {
  ['לחיצת חזה במכונות', 'אימון במכונות כושר', 'חתירה במכונת חתירה', 'מכונות']
    .forEach(function (name) {
      assert.deepStrictEqual(inferEquipment(name), ['machine'], name);
    });
});

test('«מכונה» and «מכון» still read as machine work', function () {
  assert.deepStrictEqual(inferEquipment('לחיצת כתפיים במכונה'), ['machine']);
  assert.deepStrictEqual(inferEquipment('אימון במכון'), ['machine']);
});

test('a car («מכונית») is not a machine', function () {
  assert.ok(inferEquipment('ריצה ליד המכונית').indexOf('machine') === -1);
});
