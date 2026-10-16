const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('calf raises and step-ups are legs with a squat pattern, not «ליבה»', function () {
  ['הרמת עקבים', 'הרמות עקבים על מדרגה', 'עליות קרסול', 'עליות על בהונות', 'עלייה על קצות האצבעות',
    'תאומים', 'סטפ אפ', 'סטפ-אפ', "סטפ אפ עם משקולות", 'עליות על ספסל', 'עלייה על קופסה'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.strictEqual(r.pattern, 'squat', name);
  });
});

test('burpees and jumping jacks are leg plyometrics; burpees keep core', function () {
  var burpee = Infer.inferFromName('בורפי');
  assert.deepStrictEqual(burpee.muscles, ['legs', 'core']);
  assert.strictEqual(burpee.pattern, 'plyo');
  ['ג׳אמפינג ג׳קס', "ג'אמפינג ג'קס"].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.strictEqual(r.pattern, 'plyo', name);
  });
});

test('a bare «עליות» is not a calf raise', function () {
  var r = Infer.inferFromName('עליות מתח');
  assert.strictEqual(r.muscles.indexOf('legs'), -1);
  assert.strictEqual(r.pattern, 'pull');
});
