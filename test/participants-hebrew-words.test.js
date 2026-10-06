const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('a Hebrew number word before the trainee word is a participant count', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון עם עשרה חניכים'), 10);
  assert.strictEqual(THPrompt.parseParticipants('אימון בטן שמונה ילדים'), 8);
  assert.strictEqual(THPrompt.parseParticipants('שני מתאמנים'), 2);
  assert.strictEqual(THPrompt.parseParticipants('שתי מתאמנות'), 2);
  assert.strictEqual(THPrompt.parseParticipants('חמש שחקניות'), 5);
  assert.strictEqual(THPrompt.parseParticipants('אימון לשמונה חניכים'), 8);
});

test('feminine and masculine teens are 11-19, not 10', () => {
  assert.strictEqual(THPrompt.parseParticipants('שלוש עשרה חניכות'), 13);
  assert.strictEqual(THPrompt.parseParticipants('שנים עשר שחקנים'), 12);
  assert.strictEqual(THPrompt.parseParticipants('אחת עשרה משתתפות'), 11);
  assert.strictEqual(THPrompt.parseParticipants('תשעה עשר ילדים'), 19);
});

test('tens and compound tens work', () => {
  assert.strictEqual(THPrompt.parseParticipants('עשרים חניכים'), 20);
  assert.strictEqual(THPrompt.parseParticipants('עשרים וחמישה מתאמנים'), 25);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של שלושים'), 30);
});

test('"קבוצה של" and "כיתה של" accept a number word', () => {
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של שמונה'), 8);
  assert.strictEqual(THPrompt.parseParticipants('כיתה של ארבע עשרה'), 14);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של שמונה בזוגות'), 8);
});

test('digits still win and unrelated words are not counts', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-20 חניכים בזוגות'), 20);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של 10 בזוגות'), 10);
  assert.strictEqual(THPrompt.parseParticipants('אימון עם חניכים'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון רגליים לילדים'), null);
  assert.strictEqual(THPrompt.parseParticipants('ארבע ראשי 20 דקות'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון לזוג'), 2);
});

test('parsePrompt marks the count as specified and keeps the rest', () => {
  const req = THPrompt.parsePrompt('אימון בטן 20 דקות לשמונה ילדים בלי ציוד');
  assert.strictEqual(req.participants, 8);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.duration, 20);
  assert.strictEqual(req.audience, 'kids');
  assert.deepStrictEqual(req.equipment, ['none']);
});
