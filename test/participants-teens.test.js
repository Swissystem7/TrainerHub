const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// «בני נוער» is how a coach counts teens. Only «בנים» / «בנות» / «נערים»
// were trainee words, so «אימון ל-12 בני נוער» came back as 1 trainee.
test('«N בני נוער» / «N בנות נוער» is a participant count', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-12 בני נוער'), 12);
  assert.strictEqual(THPrompt.parseParticipants('20 בני נוער בזוגות'), 20);
  assert.strictEqual(THPrompt.parseParticipants('שמונה בנות נוער'), 8);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של 15 בני הנוער'), 15);
  assert.strictEqual(THPrompt.parseParticipants('3 קבוצות של 6 בני נוער'), 18);
});

test('parsePrompt keeps the head count for teens', () => {
  const req = THPrompt.parsePrompt('אימון 40 דקות ל-12 בני נוער');
  assert.strictEqual(req.participants, 12);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.duration, 40);
});

test('«בני נוער» with no number and «בני 15» (an age) are not counts', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון לבני נוער'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון לבני 15'), null);
});
