'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«ישבנים» (plural) is a leg request, not full body', function () {
  const req = Prompt.parsePrompt('אימון ישבנים 20 דקות');
  assert.deepEqual(req.muscles, ['legs']);
  assert.equal(req.focus, 'legs');
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים וישבנים').muscles, ['legs']);
});

test('the obliques and the waist are a core request', function () {
  assert.equal(Prompt.parsePrompt('אימון אלכסונים').focus, 'core');
  assert.equal(Prompt.parsePrompt('תרגילים לשרירים האלכסוניים').focus, 'core');
  assert.equal(Prompt.parsePrompt('אימון מותניים 15 דקות').focus, 'core');
});

test('a diagonal movement is not an obliques request', function () {
  assert.equal(Prompt.parsePrompt('אימון רגליים עם צעדים באלכסון').focus, 'legs');
  assert.equal(Prompt.parsePrompt('אימון עם חתירה אלכסונית').focus, 'back');
});

test('«בלי ישבנים» rules the legs out', function () {
  const req = Prompt.parsePrompt('אימון גוף מלא בלי ישבנים');
  assert.equal(req.focus, 'full');
  assert.ok(req.excludedMuscles.indexOf('legs') !== -1);
});
