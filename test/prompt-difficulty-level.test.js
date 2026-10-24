const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('"רמת קושי גבוהה" / "דרגת קושי גבוהה" is the advanced level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון רגליים ברמת קושי גבוהה'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('אימון בדרגת קושי גבוהה 30 דקות'), 'advanced');
  assert.strictEqual(THPrompt.parseLevel('אימון ברמת הקושי הגבוהה'), 'advanced');
  assert.strictEqual(THPrompt.parsePrompt('אימון ברמת קושי גבוהה').level, 'advanced');
});

test('"רמת קושי נמוכה" / "רמת קושי בסיסית" is the beginner level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון בטן ברמת קושי נמוכה'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון בדרגת קושי נמוכה'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון ברמת קושי בסיסית'), 'beginner');
});

test('a negated difficulty is ruled out, intensity is still not a level', () => {
  assert.strictEqual(THPrompt.parseLevel('אימון לא ברמת קושי גבוהה'), null);
  assert.strictEqual(THPrompt.parseLevel('אימון למתחילים, לא ברמת קושי גבוהה'), 'beginner');
  assert.strictEqual(THPrompt.parseLevel('אימון ברמת עצימות גבוהה'), null);
});
