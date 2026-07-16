'use strict';

const assert = require('node:assert');
const { workoutVolume } = require('./workoutVolume.js');

// Normal case: 10*20 + 8*22.5 = 200 + 180 = 380
assert.strictEqual(workoutVolume([{ reps: 10, weightKg: 20 }, { reps: 8, weightKg: 22.5 }]), 380);

// Rounding to 1 decimal: 3 * 10.05 = 30.15 -> 30.2 (round half up)
assert.strictEqual(workoutVolume([{ reps: 3, weightKg: 10.05 }]), 30.2);

// Edge: reps <= 0 excluded
assert.strictEqual(workoutVolume([{ reps: 0, weightKg: 50 }, { reps: -5, weightKg: 50 }]), 0);

// Edge: weightKg <= 0 excluded (bodyweight/zero excluded per spec)
assert.strictEqual(workoutVolume([{ reps: 10, weightKg: 0 }, { reps: 10, weightKg: -5 }]), 0);

// Edge: mix of valid and invalid entries -> only valid counted (5*10=50)
assert.strictEqual(workoutVolume([{ reps: 5, weightKg: 10 }, { reps: 0, weightKg: 100 }, { reps: 5, weightKg: 0 }]), 50);

// Edge: empty array
assert.strictEqual(workoutVolume([]), 0);

// Edge: non-array / bad input
assert.strictEqual(workoutVolume(null), 0);
assert.strictEqual(workoutVolume(undefined), 0);

// Edge: malformed entries (missing/non-numeric fields, null) skipped
assert.strictEqual(workoutVolume([null, {}, { reps: '10', weightKg: 20 }, { reps: NaN, weightKg: 20 }, { reps: 4, weightKg: 5 }]), 20);

console.log('all tests passed');
