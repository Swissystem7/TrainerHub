const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

test('an explicit trainee count wins over "בזוגות" (working in pairs)', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-20 חניכים בזוגות'), 20);
  assert.strictEqual(THPrompt.parseParticipants('עבודה בזוגות 16 מתאמנים'), 16);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של 10 בזוגות'), 10);
});

test('"זוג" without a number still means two participants', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון לזוג'), 2);
  assert.strictEqual(THPrompt.parseParticipants('תרגילי זוגות'), 2);
});

test('parsePrompt keeps the group size and the partner audience together', () => {
  const req = THPrompt.parsePrompt('אימון 30 דקות ל-20 חניכים בזוגות');
  assert.strictEqual(req.participants, 20);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.audience, 'partner');
});
