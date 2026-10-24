const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('shrugs are back (traps) pull work with shoulders secondary, not «ליבה»', function () {
  ['שראגס', 'שרגס', 'שראגס עם דמבלים', 'shrugs'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['back'], name);
    assert.deepStrictEqual(r.secondary, ['shoulders'], name);
    assert.strictEqual(r.pattern, 'pull', name);
  });
});

test('«הרמת כתפיים» is a shrug: back and shoulders, pull pattern', function () {
  var r = Infer.inferFromName('הרמת כתפיים עם משקולות');
  assert.deepStrictEqual(r.muscles, ['back', 'shoulders']);
  assert.strictEqual(r.pattern, 'pull');
});

test('a shoulder press is still a push', function () {
  var r = Infer.inferFromName('לחיצת כתפיים');
  assert.deepStrictEqual(r.muscles, ['shoulders']);
  assert.strictEqual(r.pattern, 'push');
});
