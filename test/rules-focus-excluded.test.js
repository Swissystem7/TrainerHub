'use strict';

// The «מיקוד שרירים» row of the assumptions panel used to say «גוף מלא — לא
// זוהתה קבוצת שריר בתיאור» (source: default) for requests the parser read
// fine: «Full Body» in capitals (the panel tested the raw text, the parser the
// folded one) and «אימון בלי רגליים», whose excluded muscles the panel dropped.

const test = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
const Engine = require('../js/session-builder.js');
const Rules = require('../js/rules-with-sources.js');
const catalog = require('../js/catalog.json');

function focus(prompt) {
  TH.setCatalog(catalog);
  const built = Engine.buildSession(prompt, catalog);
  return Rules.rulesWithSources(built).rules.find((r) => r.id === 'focus');
}

test('«Full Body» in capitals is a full-body request, not a guess', () => {
  for (const prompt of ['Full Body 30 דקות', 'FULL BODY', 'אימון גוף־מלא 30 דקות']) {
    const rule = focus(prompt);
    assert.equal(rule.value, 'גוף מלא', prompt);
    assert.equal(rule.source.id, 'prompt', prompt);
  }
});

test('«אימון בלי רגליים» names the excluded muscle and credits the request', () => {
  const rule = focus('אימון בלי רגליים 30 דקות');
  assert.equal(rule.value, 'גוף מלא בלי רגליים');
  assert.equal(rule.source.id, 'prompt');
});

test('a prompt with no muscle words still reads as the default', () => {
  const rule = focus('אימון 30 דקות');
  assert.match(rule.value, /לא זוהתה/);
  assert.equal(rule.source.id, 'default');
});
