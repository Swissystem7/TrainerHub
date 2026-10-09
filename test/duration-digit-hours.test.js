const test = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "אימון של 2 שעות" used to return null (the UI fell back to 20 minutes):
// only "שעה", "שעתיים" and "(\d+) דק" were recognised, never digit hours.
test('parseDuration reads digit hours as minutes', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של 2 שעות'), 120);
  assert.strictEqual(THPrompt.parseDuration('אימון 3 שעות לרגליים'), 180);
  assert.strictEqual(THPrompt.parseDuration('4 שעות'), 240);
});

test('parseDuration reads decimal hours with a dot or a comma', () => {
  assert.strictEqual(THPrompt.parseDuration('אימון של 1.5 שעות'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון של 1,5 שעות'), 90);
  assert.strictEqual(THPrompt.parseDuration('0.5 שעות בטן'), 30);
  assert.strictEqual(THPrompt.parseDuration('2.25 שעות'), 135);
});

test('parseDuration adds trailing minutes, וחצי and ורבע to digit hours', () => {
  assert.strictEqual(THPrompt.parseDuration('3 שעות ו-20 דקות'), 200);
  assert.strictEqual(THPrompt.parseDuration('2 שעות ו 10 דק'), 130);
  assert.strictEqual(THPrompt.parseDuration('2 שעות וחצי'), 150);
  assert.strictEqual(THPrompt.parseDuration('3 שעות ורבע'), 195);
});

test('parseDuration ignores "0 שעות" and keeps the existing hour phrases', () => {
  assert.strictEqual(THPrompt.parseDuration('0 שעות'), null);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעתיים'), 120);
  assert.strictEqual(THPrompt.parseDuration('שעתיים ו-10 דקות'), 130);
  assert.strictEqual(THPrompt.parseDuration('שעה ו-15 דקות'), 75);
  assert.strictEqual(THPrompt.parseDuration('שעה וחצי'), 90);
  assert.strictEqual(THPrompt.parseDuration('אימון של שעה'), 60);
  assert.strictEqual(THPrompt.parseDuration('45 דקות גב'), 45);
  assert.strictEqual(THPrompt.parseDuration('אימון בטן'), null);
});

test('parsePrompt carries digit hours through', () => {
  const req = THPrompt.parsePrompt('אימון רגליים של 2 שעות ל-12 חניכים');
  assert.strictEqual(req.duration, 120);
  assert.strictEqual(req.durationSpecified, true);
  assert.strictEqual(req.participants, 12);
  assert.strictEqual(req.focus, 'legs');
});
