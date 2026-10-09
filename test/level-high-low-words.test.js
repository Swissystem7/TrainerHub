const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('"רמה גבוהה" is the advanced level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון רגליים רמה גבוהה'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('חניכים ברמה גבוהה 30 דקות'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('קבוצה ברמה הגבוהה'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('שחקנים ברמה גבוהה מאוד'), 'advanced');
});

test('"רמה נמוכה" / "רמה בסיסית" / new trainees are beginners', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון בטן רמה נמוכה'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('חניכות ברמה בסיסית'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('קבוצה ברמה התחלתית'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('חניכים חדשים 20 דקות'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('מתאמנות חדשות בלי ציוד'), 'beginner');
});

test('a high intensity or a high-knees drill is not a trainee level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון בטן בעצימות גבוהה'), null);
  assert.strictEqual(THPrompt.parseLevel('ברכיים גבוהות 20 דקות'), null);
  assert.strictEqual(THPrompt.parseLevel('קפיצות נמוכות על קונוסים'), null);
  assert.strictEqual(THPrompt.parseLevel('תרגיל חדש לגב'), null);
});

test('explicit words still win over the phrase', () => {
  assert.strictEqual(THPrompt.parseLevel('מתחילים ברמה גבוהה של מוטיבציה'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('קבוצה מתקדמת ברמה נמוכה של עייפות'), 'advanced');
});

test('parsePrompt carries the level into the request', () => {
  const req = THPrompt.parsePrompt('אימון גב 30 דקות לחניכים ברמה גבוהה');
  assert.strictEqual(req.level, 'advanced');
  assert.strictEqual(req.duration, 30);
  assert.deepStrictEqual(req.muscles, ['back']);
});
