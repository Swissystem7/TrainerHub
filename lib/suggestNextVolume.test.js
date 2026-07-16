'use strict';

const assert = require('node:assert');
const { suggestNextVolume } = require('./suggestNextVolume.js');

// Empty history -> null
assert.strictEqual(suggestNextVolume([]), null);

// Single entry -> that entry unchanged
assert.strictEqual(suggestNextVolume([40]), 40);

// Normal case: last two positive -> last*1.05 rounded to nearest 0.5
// 100 * 1.05 = 105 -> 105
assert.strictEqual(suggestNextVolume([90, 100]), 105);
// 40 * 1.05 = 42 -> 42
assert.strictEqual(suggestNextVolume([38, 40]), 42);
// 43 * 1.05 = 45.15 -> nearest 0.5 = 45
assert.strictEqual(suggestNextVolume([40, 43]), 45);
// 47 * 1.05 = 49.35 -> nearest 0.5 = 49.5
assert.strictEqual(suggestNextVolume([45, 47]), 49.5);

// Last two NOT both positive -> last unchanged
// zero is not positive
assert.strictEqual(suggestNextVolume([0, 50]), 50);
assert.strictEqual(suggestNextVolume([50, 0]), 0);
// negative is not positive
assert.strictEqual(suggestNextVolume([-10, 50]), 50);

console.log('all tests passed');
