const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('a fly is chest work, not «ליבה»', function () {
  ['פרפר משקולות', 'פרפר', 'פרפרים עם משקולות'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['chest'], name);
    assert.strictEqual(r.pattern, 'push', name);
  });
});

test('a reverse fly is rear shoulders and upper back, a pull', function () {
  ['פרפר הפוך', 'פרפר הפוך משקל גוף'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['shoulders', 'back'], name);
    assert.strictEqual(r.pattern, 'pull', name);
  });
});

test('side and front raises are shoulder work', function () {
  ['הרחקה צידית', 'הרמה קדמית', 'הרמות צד', 'הרמות צד עם משקולות', 'הרמות לצדדים'].forEach(function (name) {
    assert.deepStrictEqual(Infer.inferFromName(name).muscles, ['shoulders'], name);
  });
});

test('the butterfly sit-up and stretch, and a side leg raise, are not upper-body work', function () {
  assert.deepStrictEqual(Infer.inferFromName('כפיפות בטן פרפר').muscles, ['core']);
  assert.strictEqual(Infer.inferFromName('מתיחת פרפר').muscles.indexOf('chest'), -1);
  assert.deepStrictEqual(Infer.inferFromName('הרמת רגל לצד').muscles, ['legs']);
});
