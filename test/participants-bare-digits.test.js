const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "אימון לשמונה" gave 8 but "אימון ל-12" and "אימון 30 דקות ל-5" gave 1:
// the bare ל + count rule only knew number words, not digits.
test('a bare ל + digits is the head count', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-12'), 12);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל־7'), 7);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל 8 עם משקולות'), 8);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-6 בפארק'), 6);
  const req = THPrompt.parsePrompt('אימון 30 דקות ל-5');
  assert.strictEqual(req.participants, 5);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.duration, 30);
  const req2 = THPrompt.parsePrompt('אימון ל-5, 30 דקות');
  assert.strictEqual(req2.participants, 5);
  assert.strictEqual(req2.duration, 30);
});

test('digits with a unit, an age, a range end or a split are not people', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-20 דקות'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-30 min'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-12 חזרות'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-3 סטים'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-60+'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-10%'), null);
  assert.strictEqual(THPrompt.parseParticipants('סקוואט מ-8 ל-12, 3 סטים'), null);
  assert.strictEqual(THPrompt.parseParticipants('לחלק ל-3'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-1'), null);
  assert.strictEqual(THPrompt.parsePrompt('אימון ל-2 שעות').duration, 120);
});
