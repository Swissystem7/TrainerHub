const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');

test('a row or pulldown «to the chest» is back pulling, not a chest push', function () {
  ['משיכת גומייה לחזה', 'משיכה לחזה', 'משיכות לחזה בגומייה', 'משיכת פולי עליון לחזה',
    'משיכת כבל עד החזה'].forEach(function (name) {
    const r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['back', 'biceps'], name);
    assert.strictEqual(r.pattern, 'pull', name);
  });
});

test('chest presses and push-ups stay chest pushes', function () {
  ['לחיצת חזה', 'לחיצת חזה בגומייה', 'פתיחת חזה', 'שכיבות שמיכה'].forEach(function (name) {
    const r = Infer.inferFromName(name);
    assert.ok(r.muscles.indexOf('chest') !== -1, name);
  });
  assert.strictEqual(Infer.inferFromName('לחיצת חזה').pattern, 'push');
});
