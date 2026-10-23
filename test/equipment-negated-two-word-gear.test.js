const test = require('node:test');
const assert = require('node:assert');
const { parsePrompt } = require('../js/prompt-parser.js');

function equipment(prompt) {
  return parsePrompt(prompt).equipment;
}

test('a negated two-word gear name is not requested', function () {
  assert.deepStrictEqual(equipment('אימון רגליים בלי כדורי טניס'), ['none']);
  assert.deepStrictEqual(equipment('אימון בלי כדור כדורסל'), ['none']);
  assert.deepStrictEqual(equipment('אימון ללא כדורי כדורגל'), ['none']);
  assert.ok(equipment('אימון ידיים בלי מוט מתח').indexOf('bar') === -1);
});

test('the gear asked for next to a negated two-word name stays', function () {
  assert.deepStrictEqual(equipment('אימון רגליים עם גומיות ובלי כדורי טניס'), ['band']);
  assert.deepStrictEqual(equipment('אימון בלי כדור טניס, עם קונוסים'), ['cones']);
});

test('one-word negations still work as before', function () {
  assert.deepStrictEqual(equipment('אימון רגליים בלי משקולות'), ['none']);
  assert.deepStrictEqual(equipment('אימון עם גומיות וללא משקולות'), ['band']);
  assert.deepStrictEqual(equipment('אימון עם כדורי טניס'), ['tennis-ball']);
});
