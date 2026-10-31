'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«אימון לעשרים» / «לשלושים» with no trainee noun is the head count', () => {
  assert.equal(Prompt.parseParticipants('אימון לעשרים'), 20);
  assert.equal(Prompt.parseParticipants('אימון לשלושים, 45 דקות'), 30);
  assert.equal(Prompt.parseParticipants('אימון לעשרים עם משקולות'), 20);
  assert.equal(Prompt.parseParticipants('אימון לעשרים וחמישה'), 25);
  const p = Prompt.parsePrompt('אימון לעשרים, 30 דקות');
  assert.equal(p.participants, 20);
  assert.equal(p.participantsSpecified, true);
  assert.equal(p.duration, 30);
});

test('minutes, rounds and splits after a bare tens word are not people', () => {
  assert.equal(Prompt.parseParticipants('אימון לעשרים דקות'), null);
  assert.equal(Prompt.parseParticipants('אימון לעשרים סבבים'), null);
  assert.equal(Prompt.parseParticipants('לחלק לעשרים, 40 דקות'), null);
});
