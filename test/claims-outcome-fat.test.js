const { test } = require('node:test');
const assert = require('node:assert');
const { strictEqual } = assert;
const { claimsOutcome } = require('../js/analyzer.js');

test('איסור הבטחה לשריפת שומן', () => {
  strictEqual(claimsOutcome('אימון שורף שומן מהר'), true);
  strictEqual(claimsOutcome('שריפת שומן'), true);
  strictEqual(claimsOutcome('אימון כוח ללא הבטחות'), false);
});
