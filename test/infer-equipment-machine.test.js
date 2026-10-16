const test = require('node:test');
const assert = require('node:assert');
const { inferEquipment, inferFromName } = require('../js/infer.js');

test('gym machines by name are «מכונה», not «משקל גוף»', function () {
  ['פולי עליון', 'חתירה בכבל', 'סקוואט בסמית׳', 'לחיצת חזה במכשיר', 'לחיצת רגליים', 'פשיטת ברכיים']
    .forEach(function (name) {
      assert.deepStrictEqual(inferEquipment(name), ['machine'], name);
    });
  assert.deepStrictEqual(inferFromName('פולי עליון').equipment, ['machine']);
});

test('leg press with other named gear keeps that gear only', function () {
  assert.deepStrictEqual(inferEquipment('לחיצת רגליים עם גומייה'), ['band']);
});

test('words that only contain the machine words are left alone', function () {
  ['פוליטיקה', 'מכשירים לבית', 'מקבל כדור', 'פשיטת מרפקים', 'סקוואט'].forEach(function (name) {
    assert.ok(inferEquipment(name).indexOf('machine') === -1, name);
  });
});
