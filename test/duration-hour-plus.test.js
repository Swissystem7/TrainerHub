const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "שעה ו-15 דקות" used to return 15: the bare "(\d+) דק" match ran first
// and swallowed the hour. The hour phrase must be added to the minutes.
test('parseDuration adds the hour to "שעה ו-15 דקות"', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה ו-15 דקות'), 75);
  assert.strictEqual(THPrompt.parseDuration('שעה ו 20 דק'), 80);
  assert.strictEqual(THPrompt.parseDuration('שעה ו־10 דקות לרגליים'), 70);
});

test('parseDuration knows שעה ורבע and שעתיים', () => {
  assert.strictEqual(THPrompt.parseDuration('שעה ורבע בטן'), 75);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעתיים'), 120);
  assert.strictEqual(THPrompt.parseDuration('שעתיים וחצי'), 150);
  assert.strictEqual(THPrompt.parseDuration('שעתיים ו-10 דקות'), 130);
});

test('parseDuration keeps the existing hour and minute phrases', () => {
  assert.strictEqual(THPrompt.parseDuration('שעה וחצי'), 90);
  assert.strictEqual(THPrompt.parseDuration('חצי שעה'), 30);
  assert.strictEqual(THPrompt.parseDuration('רבע שעה'), 15);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה'), 60);
  assert.strictEqual(THPrompt.parseDuration('45 דקות גב'), 45);
  assert.strictEqual(THPrompt.parseDuration('30 min'), 30);
  assert.strictEqual(THPrompt.parseDuration('אימון בטן'), null);
});

test('parsePrompt carries the combined duration through', () => {
  const req = THPrompt.parsePrompt('אימון רגליים של שעה ו-15 דקות');
  assert.strictEqual(req.duration, 75);
  assert.strictEqual(req.durationSpecified, true);
  assert.strictEqual(req.focus, 'legs');
});
