'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

// «לא מתקדמים» rules the advanced level out. «מתקדמ» used to be checked first
// with the negation ignored, so «אימון למתחילים לא מתקדמים» built an advanced
// session for beginners.

test('a negated level is not the level', function () {
  assert.equal(Prompt.parsePrompt('אימון למתחילים לא מתקדמים').level, 'beginner');
  assert.equal(Prompt.parsePrompt('אימון ביניים, לא מתחילים').level, 'intermediate');
  assert.equal(Prompt.parsePrompt('לא ברמה גבוהה מאוד, רמה בינונית').level, 'intermediate');
  assert.equal(Prompt.parsePrompt('Not advanced, beginners').level, 'beginner');
});

test('a negated level alone leaves the level unset', function () {
  assert.equal(Prompt.parsePrompt('אימון לא למתקדמים').level, null);
  assert.equal(Prompt.parsePrompt('קבוצה לא ברמה גבוהה').level, null);
});

test('unchanged: plain levels and the level that is asked for', function () {
  assert.equal(Prompt.parsePrompt('אימון למתקדמים').level, 'advanced');
  assert.equal(Prompt.parsePrompt('אימון למתחילים').level, 'beginner');
  assert.equal(Prompt.parsePrompt('קבוצה ברמה גבוהה').level, 'advanced');
  assert.equal(Prompt.parsePrompt('לא למתחילים, למתקדמים').level, 'advanced');
});
