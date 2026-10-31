const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('a chest-to-bar pull-up is back and biceps pull work, not chest', function () {
  ['מתח לחזה', 'מתח עד החזה', 'עליות מתח לחזה', 'מתח רחב לחזה'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['back', 'biceps'], name);
    assert.deepStrictEqual(r.equipment, ['bar'], name);
    assert.strictEqual(r.pattern, 'pull', name);
  });
});

test('a real chest drill next to it keeps chest', function () {
  var r = Infer.inferFromName('שכיבות סמיכה ומתח לחזה');
  assert.ok(r.muscles.indexOf('chest') !== -1);
  assert.deepStrictEqual(Infer.inferFromName('לחיצת חזה').muscles, ['chest']);
});
