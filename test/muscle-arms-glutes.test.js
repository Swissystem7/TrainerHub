'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('"זרועות" is an arms request (biceps + triceps, arms focus)', function () {
  const req = Prompt.parsePrompt('אימון זרועות 15 דקות עם משקולות');
  assert.ok(req.muscles.indexOf('biceps') !== -1);
  assert.ok(req.muscles.indexOf('triceps') !== -1);
  assert.equal(req.focus, 'arms');
  assert.equal(req.duration, 15);
});

test('"זרוע" singular and with a prefix also reads as arms', function () {
  assert.equal(Prompt.parsePrompt('תרגילים לזרוע').focus, 'arms');
  assert.equal(Prompt.parsePrompt('חיזוק הזרועות').focus, 'arms');
});

test('"ישבן" / "עכוז" / "גלוטאוס" are leg requests', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון ישבן 20 דקות').muscles, ['legs']);
  assert.equal(Prompt.parsePrompt('אימון ישבן 20 דקות').focus, 'legs');
  assert.deepEqual(Prompt.parsePrompt('תרגילי עכוז בלי ציוד').muscles, ['legs']);
  assert.deepEqual(Prompt.parsePrompt('גלוטאוס וירכיים').muscles, ['legs']);
  assert.deepEqual(Prompt.parsePrompt('glutes 10 min').muscles, ['legs']);
});

test('arms and glutes words do not disturb an existing focus', function () {
  const req = Prompt.parsePrompt('אימון בטן וזרועות 20 דקות');
  assert.equal(req.focus, 'core');
  assert.ok(req.muscles.indexOf('biceps') !== -1);
  const legs = Prompt.parsePrompt('רגליים וישבן');
  assert.deepEqual(legs.muscles, ['legs']);
});

test('a prompt without these words is unchanged', function () {
  const req = Prompt.parsePrompt('אימון בטן 20 דקות בלי ציוד');
  assert.deepEqual(req.muscles, ['core']);
  assert.equal(req.focus, 'core');
});
