const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('running is leg work, not «ליבה»', function () {
  ['ריצה', 'ריצה קלה', 'ריצת מקום', 'ריצה 20 דקות', 'שתי דקות ריצה במקום', 'ריצות עליה', "ג'וגינג"].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.notStrictEqual(r.pattern, 'core', name);
  });
});

test('a sprint is a leg plyometric', function () {
  ['ספרינט', 'ספרינטים 6x50 מטר'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.strictEqual(r.pattern, 'plyo', name);
  });
});

test('«פריצה» and «מרוצה» are not a run', function () {
  ['פריצה', 'מרוצה'].forEach(function (name) {
    assert.strictEqual(Infer.inferFromName(name).muscles.indexOf('legs'), -1, name);
  });
});
