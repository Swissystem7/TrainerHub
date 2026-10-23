'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«אימון לשניים» / «לשלושה» with no trainee noun is the head count', () => {
  assert.equal(Prompt.parseParticipants('אימון לשניים, 30 דקות'), 2);
  assert.equal(Prompt.parseParticipants('אימון לשניים'), 2);
  assert.equal(Prompt.parseParticipants('אימון בטן לשלושה 20 דקות'), 3);
  assert.equal(Prompt.parseParticipants('אימון לארבעה בפארק'), 4);
  assert.equal(Prompt.parseParticipants('אימון לחמש עם גומיות'), 5);
  const p = Prompt.parsePrompt('אימון לשניים, 30 דקות');
  assert.equal(p.participants, 2);
  assert.equal(p.participantsSpecified, true);
  assert.equal(p.duration, 30);
});

test('a round count or a split is not people', () => {
  assert.equal(Prompt.parseParticipants('אימון לשלושה סבבים'), null);
  assert.equal(Prompt.parseParticipants('אימון מחולק לשניים: כוח וריצה'), null);
  assert.equal(Prompt.parseParticipants('לחלק לשלושה, 40 דקות'), null);
  assert.equal(Prompt.parseParticipants('אימון של 30 דקות'), null);
});

test('an explicit trainee count still wins', () => {
  assert.equal(Prompt.parseParticipants('אימון ל-8 חניכים, לשניים בתחנה'), 8);
  assert.equal(Prompt.parseParticipants('אימון לשלושה חניכים'), 3);
});
