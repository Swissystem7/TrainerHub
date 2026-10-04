'use strict';
// Ported from ext/feature-code-20260926-222014-8fee (factory bot), with the
// false positives that a bare /זוג/ had ("זוג משקולות", "בזוגות") pinned down.
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('a couple workout is two participants', () => {
  assert.equal(Prompt.parseParticipants('אימון לזוג'), 2);
  assert.equal(Prompt.parseParticipants('אימון זוגי של חצי שעה'), 2);
  assert.equal(Prompt.parseParticipants('בני זוג, אימון בבית'), 2);
});

test('"זוג" is not a head count when it means pairs or a pair of weights', () => {
  assert.equal(Prompt.parseParticipants('12 מתאמנים, עבודה בזוגות'), 12);
  assert.equal(Prompt.parseParticipants('עבודה בזוגות'), null);
  assert.equal(Prompt.parseParticipants('אימון עם זוג משקולות'), null);
});
