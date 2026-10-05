'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const Infer = require('../js/infer.js');

test('mentionsPullUp matches the pull-up word but not beginners or station words', function () {
  assert.equal(Infer.mentionsPullUp('מתח'), true);
  assert.equal(Infer.mentionsPullUp('אימון מתח'), true);
  assert.equal(Infer.mentionsPullUp('עליות מתח, 3 סטים'), true);
  assert.equal(Infer.mentionsPullUp('מתחים רחבים'), true);
  assert.equal(Infer.mentionsPullUp('מתח אוסטרלי'), true);
  assert.equal(Infer.mentionsPullUp('אימון למתחילים'), false);
  assert.equal(Infer.mentionsPullUp('מתחילות'), false);
  assert.equal(Infer.mentionsPullUp('מתחנה לתחנה'), false);
  assert.equal(Infer.mentionsPullUp(''), false);
});

test('parsePrompt keeps the back focus of a pull-up workout for beginners', function () {
  const req = Prompt.parsePrompt('אימון מתח למתחילים 20 דקות');
  assert.equal(req.level, 'beginner');
  assert.equal(req.focus, 'back');
  assert.ok(req.muscles.indexOf('back') !== -1);
  assert.ok(req.muscles.indexOf('biceps') !== -1);
  assert.deepEqual(req.equipment, ['bar']);
});

test('parsePrompt does not read beginners alone as a pull-up workout', function () {
  const req = Prompt.parsePrompt('אימון בטן למתחילים');
  assert.equal(req.level, 'beginner');
  assert.deepEqual(req.muscles, ['core']);
  assert.equal(req.focus, 'core');
});

test('inferFromName still maps pull-up names to bar / pull / back+biceps', function () {
  const row = Infer.inferFromName('מתח אוסטרלי');
  assert.ok(row.equipment.indexOf('bar') !== -1);
  assert.ok(row.muscles.indexOf('back') !== -1);
  assert.ok(row.muscles.indexOf('biceps') !== -1);
  assert.equal(Infer.inferPattern('מתח רחב'), 'pull');
  assert.equal(Infer.inferPattern('תרגיל למתחילים'), 'core');
});
