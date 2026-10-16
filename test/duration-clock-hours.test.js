const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "אימון 1:30 שעות" was 1800: the digit-hour regex took "30 שעות" as thirty
// hours. "2:00 שעות" read "00 שעות" as zero and fell back to 20 minutes.
test('parseDuration reads H:MM before שעות / שעה as hours and minutes', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון 1:30 שעות'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון 2:00 שעות'), 120);
  assert.strictEqual(THPrompt.parseDuration('אימון של 1:15 שעה'), 75);
  assert.strictEqual(THPrompt.parseDuration('אימון 0:45 שעות'), 45);
});

test('parseDuration keeps clock times and other hour forms', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון בשעה 18:00'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון בשעה 17:00 של 45 דקות'), 45);
  assert.strictEqual(THPrompt.parseDuration('אימון 1.5 שעות'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון 2 שעות ו-20 דקות'), 140);
});

test('parsePrompt carries an H:MM length through', () => {
  const req = THPrompt.parsePrompt('אימון רגליים 1:30 שעות ל-10 חניכים');
  assert.strictEqual(req.duration, 90);
  assert.strictEqual(req.durationSpecified, true);
  assert.strictEqual(req.participants, 10);
});
