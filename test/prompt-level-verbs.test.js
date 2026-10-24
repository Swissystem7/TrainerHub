'use strict';
// «שמתחיל» / «שמתקדמת» are verbs ("that starts", "that progresses"), not the
// trainees' level. parseLevel matched the «מתחיל» inside «שמתחיל», so
// «אימון רגליים שמתחיל בחימום» became a beginner session.
const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

function level(text) {
  return Prompt.parsePrompt(text).level;
}

test('a session that starts or progresses some way has no level', () => {
  for (const text of [
    'אימון רגליים שמתחיל בחימום קצר',
    'אימון גב שמתחיל בריצה',
    'סדרה שמתחילה בקלות',
    'אימון שמתקדמת בו העצימות'
  ]) {
    assert.equal(level(text), null, text);
  }
});

test('a level named next to such a verb is kept', () => {
  assert.equal(level('אימון למתחילים שמתקדם בהדרגה'), 'beginner');
  assert.equal(level('אימון למתקדמים שמתחיל בחימום'), 'advanced');
  assert.equal(level('אימון מתחילים'), 'beginner');
  assert.equal(level('אימון למתקדמים'), 'advanced');
});
