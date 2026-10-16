const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "אימון 1.5 שעה" was 60: digit hours only matched the plural "שעות", so the
// bare-"שעה" rule took over. "3/4 שעה" and "1/2 שעה" were 60 too.
test('parseDuration reads a decimal before the singular שעה', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון 1.5 שעה'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון 1,5 שעה לרגליים'), 90);
  assert.strictEqual(THPrompt.parseDuration('0.75 שעה'), 45);
});

test('parseDuration reads a fraction of an hour', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון 3/4 שעה'), 45);
  assert.strictEqual(THPrompt.parseDuration('1/2 שעה בטן'), 30);
  assert.strictEqual(THPrompt.parseDuration('½ שעה'), 30);
});

test('parseDuration keeps digit-hour extras and clock times', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון 1 שעה ו-20 דקות'), 80);
  assert.strictEqual(THPrompt.parseDuration('1 שעה וחצי'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון בשעה 17:00 של 45 דקות'), 45);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה בשעה 18:00'), 60);
  assert.strictEqual(THPrompt.parseDuration('אימון 2.5 שעות'), 150);
});

test('parsePrompt carries a fractional hour through', () => {
  const req = THPrompt.parsePrompt('אימון גב 1.5 שעה ל-8 חניכים');
  assert.strictEqual(req.duration, 90);
  assert.strictEqual(req.durationSpecified, true);
  assert.strictEqual(req.participants, 8);
});
