const { test } = require('node:test');
const assert = require('node:assert');
const { strictEqual } = assert;
const { claimsOutcome } = require('../js/analyzer.js');

test('איסור הבטחה לשריפת שומן', () => {
  strictEqual(claimsOutcome('אימון שורף שומן מהר'), true);
  strictEqual(claimsOutcome('שריפת שומן'), true);
  strictEqual(claimsOutcome('אימון כוח ללא הבטחות'), false);
});

test('no built-in stimulus text promises an outcome', () => {
  const { STIMULUS } = require('../js/analyzer.js');
  Object.keys(STIMULUS).forEach((k) => {
    const s = STIMULUS[k];
    [s.label, s.detail, s.he, s.text].filter(Boolean).forEach((txt) => {
      strictEqual(claimsOutcome(txt), false, k + ': ' + txt);
    });
  });
});
