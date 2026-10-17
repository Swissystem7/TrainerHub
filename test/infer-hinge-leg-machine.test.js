const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('deadlifts and good mornings are legs and back with a hinge pattern, not «ליבה»', function () {
  ['דדליפט', 'דדליפט רומני', 'דדליפט רומני עם משקולות', 'גוד מורנינג'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs', 'back'], name);
    assert.strictEqual(r.pattern, 'hinge', name);
  });
  var thrust = Infer.inferFromName('היפ תראסט');
  assert.deepStrictEqual(thrust.muscles, ['legs']);
  assert.strictEqual(thrust.pattern, 'hinge');
});

test('«פשיטת ברכיים» and «לחיצת רגליים» are leg work, not triceps or a chest press', function () {
  ['פשיטת ברכיים', 'לחיצת רגליים'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.strictEqual(r.pattern, 'squat', name);
    assert.deepStrictEqual(r.secondary, [], name);
  });
});

test('elbow extensions and chest presses keep their muscles', function () {
  assert.deepStrictEqual(Infer.inferMuscles('פשיטת מרפקים מעל הראש'), ['triceps']);
  assert.strictEqual(Infer.inferFromName('פשיטת מרפקים').pattern, 'push');
  assert.deepStrictEqual(Infer.inferMuscles('לחיצת חזה'), ['chest']);
  assert.strictEqual(Infer.inferPattern('לחיצת כתפיים'), 'push');
});

test('the manage page proposal for a «דדליפט» clip fills «רגליים», not «ליבה»', function () {
  var p = Infer.proposeEntry({ url: 'https://youtu.be/abcdefghijk', name: 'דדליפט רומני' });
  assert.deepStrictEqual(p.muscles, ['legs', 'back']);
});
