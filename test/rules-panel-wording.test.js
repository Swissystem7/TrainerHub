'use strict';

// The rules panel read «1 דקות» for «אימון 1 דקה» (duration and exercise-count
// rows), and a Main phase cut to one set read «סט אחד × … · 120 שנ׳ מנוחה בין
// סטים» — one set has nothing to rest between.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const Rules = require('../js/rules-with-sources.js');
const catalog = require('../js/catalog.json');

function rule(prompt, id) {
  const built = Engine.buildSession(prompt, catalog);
  return Rules.rulesWithSources(built).rules.find((r) => r.id === id).value;
}

test('a one-minute workout reads «דקה», not «1 דקות»', () => {
  assert.equal(rule('אימון 1 דקה', 'duration'), 'דקה');
  const count = rule('אימון 1 דקה', 'exercise_count');
  assert.match(count, /לאימון של דקה/);
  assert.doesNotMatch(count, /1 דקות/);
  assert.equal(rule('אימון 20 דקות', 'duration'), '20 דקות');
});

test('one set rests after the set, not «בין סטים»', () => {
  const one = rule('אימון כוח לרגליים 10 דקות', 'prescription');
  assert.match(one, /^סט אחד × 4-6 חזרות · 120 שנ׳ מנוחה אחרי הסט/);
  assert.doesNotMatch(one, /בין סטים/);
  assert.match(rule('אימון חזה 45 דקות', 'prescription'), /^3 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים$/);
});
