'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«אימון לשלישייה» / «לרביעייה» / «לחמישייה» is 3 / 4 / 5 trainees', () => {
  assert.equal(Prompt.parseParticipants('אימון לשלישייה'), 3);
  assert.equal(Prompt.parseParticipants('אימון לשלישיה, 30 דקות'), 3);
  assert.equal(Prompt.parseParticipants('אימון רגליים לרביעייה בפארק'), 4);
  assert.equal(Prompt.parseParticipants('אימון לרביעיה'), 4);
  assert.equal(Prompt.parseParticipants('אימון לחמישייה עם גומיות'), 5);
  const p = Prompt.parsePrompt('אימון לשלישייה 30 דקות');
  assert.equal(p.participants, 3);
  assert.equal(p.participantsSpecified, true);
  assert.equal(p.duration, 30);
});

test('«4 שלישיות» / «שתי חמישיות» multiply by the unit size', () => {
  assert.equal(Prompt.parseParticipants('אימון ל-4 שלישיות'), 12);
  assert.equal(Prompt.parseParticipants('אימון לשתי חמישיות'), 10);
});

test('working in trios, a weekday or a negation is not a head count', () => {
  assert.equal(Prompt.parseParticipants('אימון בשלישיות'), null);
  assert.equal(Prompt.parseParticipants('אימון ליום חמישי'), null);
  assert.equal(Prompt.parseParticipants('אימון לא לשלישייה'), null);
  assert.equal(Prompt.parseParticipants('אימון ל-12 חניכים, שלישייה בכל תחנה'), 12);
});
