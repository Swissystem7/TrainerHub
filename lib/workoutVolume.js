'use strict';

// workoutVolume(sets): sum of reps*weightKg over entries where both
// reps > 0 and weightKg > 0, rounded to 1 decimal.
function workoutVolume(sets) {
  if (!Array.isArray(sets)) return 0;
  let total = 0;
  for (const set of sets) {
    if (!set || typeof set !== 'object') continue;
    const reps = set.reps;
    const weightKg = set.weightKg;
    if (typeof reps !== 'number' || typeof weightKg !== 'number') continue;
    if (!(reps > 0) || !(weightKg > 0)) continue; // also skips NaN
    total += reps * weightKg;
  }
  return Math.round(total * 10) / 10;
}

module.exports = { workoutVolume };
