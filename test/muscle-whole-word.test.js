'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('"עצימות גבוהה" is not read as a back workout', function () {
  const req = Prompt.parsePrompt('אימון בטן 20 דקות בעצימות גבוהה');
  assert.deepEqual(req.muscles, ['core']);
  assert.equal(req.focus, 'core');
});

test('"ברכיים גבוהות" does not add back to a legs prompt', function () {
  const req = Prompt.parsePrompt('אימון רגליים עם ברכיים גבוהות');
  assert.deepEqual(req.muscles, ['legs']);
  assert.equal(req.focus, 'legs');
});

test('"בעמידה" does not add arms to a legs prompt', function () {
  const req = Prompt.parsePrompt('אימון רגליים בעמידה 15 דקות');
  assert.deepEqual(req.muscles, ['legs']);
  assert.equal(req.focus, 'legs');
});

test('"כדורגל" does not read as a legs request', function () {
  const req = Prompt.parsePrompt('אימון בטן לקבוצת כדורגל');
  assert.deepEqual(req.muscles, ['core']);
  assert.equal(req.focus, 'core');
  assert.equal(req.audience, 'sport');
});

test('"ליד" (next to) is not an arm request', function () {
  const req = Prompt.parsePrompt('אימון בטן ליד הקיר');
  assert.deepEqual(req.muscles, ['core']);
});

test('whole-word back, arm and leg requests still match, with and without prefixes', function () {
  assert.ok(Prompt.parsePrompt('כוח גב 30 דקות').muscles.indexOf('back') !== -1);
  assert.ok(Prompt.parsePrompt('תרגילים לגב').muscles.indexOf('back') !== -1);
  assert.ok(Prompt.parsePrompt('חזה וגב').muscles.indexOf('back') !== -1);
  assert.equal(Prompt.parsePrompt('אימון גב').focus, 'back');

  const arm = Prompt.parsePrompt('אימון יד 10 דקות');
  assert.ok(arm.muscles.indexOf('biceps') !== -1);
  assert.ok(arm.muscles.indexOf('triceps') !== -1);
  assert.equal(arm.focus, 'arms');

  assert.ok(Prompt.parsePrompt('תרגילי רגל אחת').muscles.indexOf('legs') !== -1);
  assert.ok(Prompt.parsePrompt('אימון רגליים').muscles.indexOf('legs') !== -1);
  assert.ok(Prompt.parsePrompt('תרגילים לרגליים').muscles.indexOf('legs') !== -1);
});
