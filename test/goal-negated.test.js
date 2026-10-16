'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

// «אימון סיבולת, לא כוח» asks for endurance and rules strength out. The goal
// check saw «כוח» first and returned a strength session (heavy, long rests).

test('a negated goal is not the goal', function () {
  assert.equal(Prompt.parseGoal('אימון סיבולת, לא כוח'), 'endurance');
  assert.equal(Prompt.parseGoal('אימון סיבולת ולא כוח'), 'endurance');
  assert.equal(Prompt.parseGoal('לא כוח, סיבולת'), 'endurance');
  assert.equal(Prompt.parseGoal('אימון קרדיו בלי כוח'), 'endurance');
  assert.equal(Prompt.parseGoal('אימון היפרטרופיה לא כוח'), 'hypertrophy');
  assert.equal(Prompt.parseGoal('ללא כוח וקרדיו, מסת שריר'), 'hypertrophy');
  assert.equal(Prompt.parseGoal('Endurance, not strength'), 'endurance');
});

test('a negated goal alone leaves the goal unset', function () {
  assert.equal(Prompt.parseGoal('אימון לא כוח'), null);
});

test('the requested goal still wins', function () {
  assert.equal(Prompt.parseGoal('אימון כוח'), 'strength');
  assert.equal(Prompt.parseGoal('אימון כוח בלי קרדיו'), 'strength');
  assert.equal(Prompt.parseGoal('אימון כוח ובלי קרדיו'), 'strength');
  assert.equal(Prompt.parseGoal('no cardio, strength'), 'strength');
  assert.equal(Prompt.parseGoal('אימון כוח בלי משקולות'), 'strength');
  assert.equal(Prompt.parseGoal('לא יותר מ 20 דקות, כוח'), 'strength');
});

test('the session uses the endurance prescription', function () {
  assert.equal(Prompt.parsePrompt('אימון רגליים סיבולת, לא כוח').goal, 'endurance');
});
