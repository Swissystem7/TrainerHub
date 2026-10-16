const { test } = require('node:test');
const assert = require('node:assert');
const THPrompt = require('../js/prompt-parser.js');

// "ל-15 חיילים" used to give null, so the session was planned for one person.
test('soldiers, pupils, students, athletes, men and women are trainee words', () => {
  assert.strictEqual(THPrompt.parseParticipants('אימון ל-15 חיילים'), 15);
  assert.strictEqual(THPrompt.parseParticipants('חמישה עשר חיילים'), 15);
  assert.strictEqual(THPrompt.parseParticipants('12 תלמידים'), 12);
  assert.strictEqual(THPrompt.parseParticipants('15 תלמידי כיתה ח'), 15);
  assert.strictEqual(THPrompt.parseParticipants('20 סטודנטים'), 20);
  assert.strictEqual(THPrompt.parseParticipants('15 ספורטאים'), 15);
  assert.strictEqual(THPrompt.parseParticipants('12 לוחמים'), 12);
  assert.strictEqual(THPrompt.parseParticipants('8 נשים'), 8);
  assert.strictEqual(THPrompt.parseParticipants('8 גברים'), 8);
});

// "3 קבוצות של 5" used to give null, and "3 קבוצות של 5 חניכים" gave 5.
test('"N קבוצות של M" counts every group', () => {
  assert.strictEqual(THPrompt.parseParticipants('3 קבוצות של 5'), 15);
  assert.strictEqual(THPrompt.parseParticipants('3 קבוצות של 5 חניכים'), 15);
  assert.strictEqual(THPrompt.parseParticipants('4 קבוצות עם 6 ילדים'), 24);
  assert.strictEqual(THPrompt.parseParticipants('שלוש קבוצות של חמישה'), 15);
});

test('groups of minutes or reps are not head counts', () => {
  assert.strictEqual(THPrompt.parseParticipants('3 קבוצות של 5 דקות'), null);
  assert.strictEqual(THPrompt.parseParticipants('3 קבוצות של 10 חזרות'), null);
  assert.strictEqual(THPrompt.parseParticipants('4 קבוצות'), null);
  assert.strictEqual(THPrompt.parseParticipants('אימון לחיילים'), null);
});

test('parsePrompt builds a group session for "ל-15 חיילים"', () => {
  const req = THPrompt.parsePrompt('אימון תחנות 30 דקות ל-15 חיילים');
  assert.strictEqual(req.participants, 15);
  assert.strictEqual(req.participantsSpecified, true);
});
