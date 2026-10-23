'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«לשנינו» / «לשלושתנו» counts everyone in the group', () => {
  assert.equal(Prompt.parseParticipants('אימון לשנינו, 30 דקות'), 2);
  assert.equal(Prompt.parseParticipants('אימון רגליים לשלושתנו'), 3);
  assert.equal(Prompt.parseParticipants('אימון לארבעתנו בפארק'), 4);
});

test('«לי ולחבר» / «אני ואשתי» is the speaker plus one', () => {
  assert.equal(Prompt.parseParticipants('אימון לי ולחבר'), 2);
  assert.equal(Prompt.parseParticipants('אימון לי ולחברה שלי, 40 דקות'), 2);
  assert.equal(Prompt.parseParticipants('אני ואשתי רוצים אימון בבית'), 2);
  assert.equal(Prompt.parseParticipants('אימון בשבילי ועם אחי'), 2);
  assert.equal(Prompt.parseParticipants('אני ובן זוגי, אימון גב'), 2);
  const p = Prompt.parsePrompt('אימון כוח לי ולחבר 45 דקות');
  assert.equal(p.participants, 2);
  assert.equal(p.participantsSpecified, true);
  assert.equal(p.duration, 45);
});

test('a solo request or an explicit count is unchanged', () => {
  assert.equal(Prompt.parseParticipants('אימון לי, 30 דקות'), null);
  assert.equal(Prompt.parseParticipants('אני רוצה אימון חזה'), null);
  assert.equal(Prompt.parseParticipants('אימון ל-8 חניכים, אני והעוזר מדריכים'), 8);
});
