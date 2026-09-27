const test = require('node:test');
const assert = require('node:assert');
const { isRestToken } = require('../js/ingest.js');

test('isRestToken recognizes הפסקה בין סטים as a rest token', () => {
  assert.strictEqual(isRestToken('הפסקה בין סטים'), true);
});
