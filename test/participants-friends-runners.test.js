const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "אימון ל-4 חברים" used to give 1: friends, gymnasts, runners and clients
// were not trainee words, so the count was lost.
test('חברים / מתעמלים / רצים / לקוחות after a number are a head count', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-4 חברים'), 4);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-4 חברות'), 4);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-10 מתעמלים'), 10);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-8 רצים'), 8);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-12 לקוחות'), 12);
  assert.strictEqual(THPrompt.parseParticipants('אימון לשישה חברים'), 6);
});

test('the words must stand alone: חברה, רצינות and לקוח are not counts', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון של 30 דקות עם חברה'), null);
  assert.strictEqual(THPrompt.parseParticipants('3 רצינות'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-1 לקוח'), null);
});

test('parsePrompt keeps the minutes and the friends apart', () => {
  const req = THPrompt.parsePrompt('אימון ל-3 חברים, 30 דקות');
  assert.strictEqual(req.participants, 3);
  assert.strictEqual(req.participantsSpecified, true);
  assert.strictEqual(req.duration, 30);
});
