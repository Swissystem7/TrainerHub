'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«2 נגד 2» / «שלושה מול שלושה» / «3 על 3» counts both sides', () => {
  assert.equal(Prompt.parseParticipants('אימון 2 נגד 2'), 4);
  assert.equal(Prompt.parseParticipants('אימון 3 על 3 כדורסל'), 6);
  assert.equal(Prompt.parseParticipants('אימון שלושה נגד שלושה'), 6);
  assert.equal(Prompt.parseParticipants('משחק 4 מול 4 לילדים'), 8);
  assert.equal(Prompt.parseParticipants('1 נגד 1'), 2);
  const p = Prompt.parsePrompt('אימון 2 נגד 2, 30 דקות');
  assert.equal(p.participants, 4);
  assert.equal(p.participantsSpecified, true);
  assert.equal(p.duration, 30);
});

test('an explicit head count or pairs count still wins over the matchup', () => {
  assert.equal(Prompt.parseParticipants('אימון 10 ילדים 2 נגד 2'), 10);
  assert.equal(Prompt.parseParticipants('4 זוגות 2 נגד 2'), 8);
});

test('sets, time, 5x5 and a personal one-on-one are not a matchup', () => {
  assert.equal(Prompt.parseParticipants('אימון 5 על 5'), null);
  assert.equal(Prompt.parseParticipants('אימון אישי אחד על אחד'), null);
  assert.equal(Prompt.parseParticipants('סקוואט 3 על 12'), null);
  assert.equal(Prompt.parseParticipants('אימון 3 על 3 דקות'), null);
  assert.equal(Prompt.parseParticipants('2 נגד 2 חזרות'), null);
  assert.equal(Prompt.parseParticipants('חתירה על הברכיים'), null);
});
