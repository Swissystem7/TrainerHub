const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "5 זוגות" used to return 2: the "זוג" fallback fired because no trainee
// word followed the number. A count of pairs is twice as many trainees.
test('a number of pairs is multiplied by two', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-5 זוגות'), 10);
  assert.strictEqual(THPrompt.parseParticipants('חמישה זוגות'), 10);
  assert.strictEqual(THPrompt.parseParticipants('אימון של שלושה זוגות'), 6);
  assert.strictEqual(THPrompt.parseParticipants('עשרה זוגות של חניכים'), 20);
  assert.strictEqual(THPrompt.parseParticipants('10 זוגות'), 20);
});

test('triples and quads multiply by three and four', () => {
  assert.strictEqual(THPrompt.parseParticipants('3 שלשות'), 9);
  assert.strictEqual(THPrompt.parseParticipants('ארבע שלשות'), 12);
  assert.strictEqual(THPrompt.parseParticipants('שתי רביעיות'), 8);
  assert.strictEqual(THPrompt.parseParticipants('5 רביעיות'), 20);
});

test('an explicit trainee count still wins over the pair count', () => {
  assert.strictEqual(THPrompt.parseParticipants('20 חניכים בזוגות'), 20);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של 10 בזוגות'), 10);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של שמונה בזוגות'), 8);
  assert.strictEqual(THPrompt.parseParticipants('12 מתאמנים ב-6 זוגות'), 12);
});

test('"בזוגות" and "זוגות" without a number still mean two', () => {
  assert.strictEqual(THPrompt.parseParticipants('עבודה בזוגות'), 2);
  assert.strictEqual(THPrompt.parseParticipants('תרגילי זוגות'), 2);
  assert.strictEqual(THPrompt.parseParticipants('אימון לזוג'), 2);
  assert.strictEqual(THPrompt.parseParticipants('כמה זוגות'), 2);
});

test('parsePrompt carries the multiplied count and the partner audience', () => {
  const req = THPrompt.parsePrompt('אימון בטן 30 דקות ל-6 זוגות');
  assert.strictEqual(req.participants, 12);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.audience, 'partner');
  assert.strictEqual(req.duration, 30);
});
