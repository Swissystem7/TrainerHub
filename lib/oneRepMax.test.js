'use strict';

const assert = require('node:assert');
const { oneRepMax } = require('./oneRepMax.js');

// normal
assert.strictEqual(oneRepMax(100, 10), 133.3); // 100*(1+10/30)=133.33 -> 133.3
assert.strictEqual(oneRepMax(60, 5), 70);       // 60*(1+5/30)=70

// reps === 1 -> weightKg
assert.strictEqual(oneRepMax(80, 1), 80);

// reps < 1 -> null
assert.strictEqual(oneRepMax(100, 0), null);
assert.strictEqual(oneRepMax(100, -3), null);

// weightKg <= 0 -> null
assert.strictEqual(oneRepMax(0, 5), null);
assert.strictEqual(oneRepMax(-50, 5), null);

console.log('ok');
