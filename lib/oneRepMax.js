'use strict';

// Epley 1RM: weightKg*(1+reps/30), rounded to 1 decimal.
function oneRepMax(weightKg, reps) {
  if (weightKg <= 0 || reps < 1) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

module.exports = { oneRepMax };
