'use strict';

// Regression: a WhatsApp paste «💪 סקוואט 3x10 💪» came out of the studio editor
// named «💪 סקוואט 💪», «1️⃣ מתח 3x8» named «1️⃣ מתח», and a header «🔥 חימום:»
// was not a phase at all - it became an exercise named «🔥 חימום» with 10 reps.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function all(text) {
  const out = [];
  parseWorkoutClient(text).phases.forEach(function (p) {
    p.exercises.forEach(function (e) { out.push(e); });
  });
  return out;
}

test('emoji around an exercise are not part of its name', () => {
  const ex = all([
    'אימון כוח 💪',
    '💪 סקוואט 3x10 💪',
    '🔥 בורפי 30 שניות',
    'ריצה 5 דקות 🏃‍♂️',
    '✅ שכיבות סמיכה 3x12',
    '1️⃣ מתח 3x8',
    '⭐️ פלאנק 3x30 שניות 👍🏽'
  ].join('\n')).filter(function (e) { return e.name !== 'חימום כללי' && e.name !== 'מתיחות'; });
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'בורפי', 'ריצה', 'שכיבות סמיכה', 'מתח', 'פלאנק']);
  assert.deepEqual(ex.map(function (e) { return [e.sets, e.reps, e.duration_seconds]; }),
    [[3, 10, null], [1, null, 30], [1, null, 300], [3, 12, null], [3, 8, null], [3, null, 30]]);
});

test('an emoji phase header is a phase, not an exercise', () => {
  const ex = all('אימון\n🔥 חימום:\nקפיצות 30 שניות\n💥 עיקרי:\nסקוואט 3x10\n🧘 שחרור:\nמתיחות 2 דקות');
  const names = ex.map(function (e) { return e.name; });
  assert.ok(names.indexOf('קפיצות') !== -1 && names.indexOf('סקוואט') !== -1);
  names.forEach(function (n) { assert.doesNotMatch(n, /חימום$|עיקרי|שחרור/); });
});

test('the title loses its emoji too', () => {
  assert.equal(parseWorkoutClient('🔥 אימון בוקר 🔥\nסקוואט 3x10').title, 'אימון בוקר');
});
