const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "20 איש" is the everyday way to say twenty people. It used to give null,
// and "20 איש בזוגות" gave 2 because only the "זוג" fallback matched.
test('"איש" after a number is a participant count', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-20 איש'), 20);
  assert.strictEqual(THPrompt.parseParticipants('20 איש בזוגות'), 20);
  assert.strictEqual(THPrompt.parseParticipants('חמישה עשר איש'), 15);
  assert.strictEqual(THPrompt.parseParticipants('אימון בטן לעשרים איש'), 20);
});

test('בנים / בנות / נערים / נערות are trainee words too', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון 12 בנות גב'), 12);
  assert.strictEqual(THPrompt.parseParticipants('קבוצה של שמונה בנים'), 8);
  assert.strictEqual(THPrompt.parseParticipants('20 נערים בזוגות'), 20);
  assert.strictEqual(THPrompt.parseParticipants('שש נערות'), 6);
});

test('"איש" must be a whole word: אישי, אישור and אישה are not counts', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון אישי 20 דקות'), null);
  assert.strictEqual(THPrompt.parseParticipants('ישיבה של 20 אישור'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-3 אישה'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון לאיש'), null);
});

test('parsePrompt builds the group plan for "20 איש"', () => {
  const req = THPrompt.parsePrompt('אימון תחנות 40 דקות ל-20 איש בזוגות');
  assert.strictEqual(req.participants, 20);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.duration, 40);
  assert.strictEqual(req.audience, 'partner');
});
