const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// «אימון לשלושה» already counted three trainees, but the same request typed
// with digits («אימון 30 דקות ל-3», «ל3») gave a one-person session.
test('a bare ל + digits is the head count', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון 30 דקות ל-3'), 3);
  assert.strictEqual(THPrompt.parseParticipants('אימון 30 דקות ל3'), 3);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל 8 עם גומיות'), 8);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-12, 40 דקות'), 12);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-4 בפארק'), 4);
});

test('times, durations and split counts after ל are not people', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון היום ל-18:00'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-8 בבוקר'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-7 בערב'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-30 דקות'), null);
  assert.strictEqual(THPrompt.parseParticipants('עד ל-3 סבבים'), null);
  assert.strictEqual(THPrompt.parseParticipants('מחולק ל-3'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-3 קבוצות של 8'), 24);
});

test('parsePrompt marks the digit count as specified', () => {
  const req = THPrompt.parsePrompt('אימון 30 דקות ל3');
  assert.strictEqual(req.participants, 3);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.duration, 30);
});
