const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "בשעה 17:00" used to return 60: the bare "שעה" regex read the clock time
// as a one-hour workout, and the request was marked durationSpecified.
test('a clock time is not a duration', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון בטן בשעה 17:00'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון גב משעה 4 עד 5'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון ליבה, השעה 9'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון בשעה 5 בערב'), null);
  assert.strictEqual(THPrompt.parseDuration('רגליים עד שעה 18:30'), null);
  assert.strictEqual(THPrompt.parseDuration('נפגשים ובשעה 16:00 מתחילים'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון חזה שעה 17.30'), null);
});

test('the real duration survives next to a clock time', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה בשעה 18:00'), 60);
  assert.strictEqual(THPrompt.parseDuration('אימון רגליים 20 דקות בשעה 16:30'), 20);
  assert.strictEqual(THPrompt.parseDuration('בשעה 7 חצי שעה בטן'), 30);
  assert.strictEqual(THPrompt.parseDuration('שעה וחצי גב, מתחילים בשעה 9'), 90);
  assert.strictEqual(THPrompt.parseDuration('משעה 4 עד 5 אימון של 45 דקות'), 45);
});

test('hour phrases that are not clock times still count', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון עד שעה'), 60);
  assert.strictEqual(THPrompt.parseDuration('שעה גב'), 60);
  assert.strictEqual(THPrompt.parseDuration('בשעה 20 דקות'), 20);
  assert.strictEqual(THPrompt.parseDuration('שעה ו-15 דקות'), 75);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה'), 60);
});

test('parsePrompt does not mark a clock-only prompt as a specified duration', () => {
  const req = THPrompt.parsePrompt('אימון בטן בלי ציוד בשעה 17:00');
  assert.strictEqual(req.durationSpecified, false);
  assert.strictEqual(req.duration, 20);
  assert.deepStrictEqual(req.muscles, ['core']);
  const timed = THPrompt.parsePrompt('אימון בטן 40 דקות בשעה 17:00');
  assert.strictEqual(timed.durationSpecified, true);
  assert.strictEqual(timed.duration, 40);
});
