const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../js/prompt-parser.js');

// «ובלי» / «וללא» / «ולא» are the same negation as «בלי» / «ללא» / «לא». Before
// this the ו־ hid it: «אימון רגליים ובלי משקולות» came back as a dumbbell
// request, «למתחילים ולא למתקדמים» as advanced, «לרגליים ולא לבטן» as legs + core.

test('gear joined with ו־ after a negation is ruled out', () => {
  assert.deepStrictEqual(P.parsePrompt('אימון רגליים ובלי משקולות').equipment, ['none']);
  assert.deepStrictEqual(P.parsePrompt('אימון רגליים עם גומיות וללא משקולות').equipment, ['band']);
});

test('a level ruled out with «ולא» is not the level', () => {
  assert.strictEqual(P.parsePrompt('אימון למתחילים ולא למתקדמים').level, 'beginner');
});

test('a muscle ruled out with «ולא» / «ובלי» is excluded, not added', () => {
  const r = P.parsePrompt('אימון לרגליים ולא לבטן');
  assert.deepStrictEqual(r.muscles, ['legs']);
  assert.deepStrictEqual(r.excludedMuscles, ['core']);
  const c = P.parsePrompt('אימון חזה ובלי כתפיים');
  assert.deepStrictEqual(c.muscles, ['chest']);
  assert.deepStrictEqual(c.excludedMuscles, ['shoulders']);
});

test('words that only start with ו־לא are untouched', () => {
  const r = P.parsePrompt('אימון רגליים ולאט עם משקולות');
  assert.deepStrictEqual(r.muscles, ['legs']);
  assert.deepStrictEqual(r.equipment, ['dumbbells']);
  assert.strictEqual(P.parsePrompt('אימון 30 דקות ולא יותר').duration, 30);
});
