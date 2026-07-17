const assert = require('node:assert');
const { analyzeProgressTrends } = require('./analyzeProgressTrends.js');

// Normal case: improving trend with weight decrease in fat_loss phase
const normalInput = [
  { date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50, strengthScores: { bench: 100, squat: 150 } } },
  { date: '2024-01-08', metrics: { weight: 98, bodyFat: 24, cardioEndurance: 55, strengthScores: { bench: 105, squat: 155 } } },
  { date: '2024-01-15', metrics: { weight: 96, bodyFat: 23, cardioEndurance: 60, strengthScores: { bench: 110, squat: 160 } } }
];
const normalResult = analyzeProgressTrends(normalInput, 'fat_loss');
assert.strictEqual(normalResult.trend, 'improving');
assert.ok(normalResult.significantChanges.length > 0);
assert.ok(normalResult.recommendations.length > 0);

// Edge case: insufficient data (less than 2 entries)
const singleEntry = [{ date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50 } }];
const insufficientResult = analyzeProgressTrends(singleEntry, 'hypertrophy');
assert.strictEqual(insufficientResult.trend, 'insufficient_data');
assert.deepStrictEqual(insufficientResult.significantChanges, []);
assert.deepStrictEqual(insufficientResult.recommendations, ['Need more measurements to analyze trends']);

// Edge case: empty array
const emptyResult = analyzeProgressTrends([], 'strength');
assert.strictEqual(emptyResult.trend, 'insufficient_data');
assert.deepStrictEqual(emptyResult.significantChanges, []);
assert.deepStrictEqual(emptyResult.recommendations, ['Need more measurements to analyze trends']);

// Edge case: invalid program phase defaults to maintenance.
// weight 100->99 (~1%) and bodyFat 25->24 (~4%) over one week are both below the
// spec's +/-0.05 normalized-slope threshold, so every metric is 'stable' -> 'stagnant'.
// (An earlier revision wrongly expected 'declining' for two weakly-DECREASING metrics.)
const invalidPhaseInput = [
  { date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50 } },
  { date: '2024-01-08', metrics: { weight: 99, bodyFat: 24, cardioEndurance: 52 } }
];
const invalidPhaseResult = analyzeProgressTrends(invalidPhaseInput, 'invalid_phase');
assert.strictEqual(invalidPhaseResult.trend, 'stagnant');
assert.ok(invalidPhaseResult.recommendations.some(r => r.includes('Reassess')));

// Edge case: null/undefined/NaN values in metrics
const nullValuesInput = [
  { date: '2024-01-01', metrics: { weight: null, bodyFat: undefined, cardioEndurance: NaN, strengthScores: { bench: null } } },
  { date: '2024-01-08', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50, strengthScores: { bench: 100 } } }
];
const nullValuesResult = analyzeProgressTrends(nullValuesInput, 'maintenance');
assert.strictEqual(nullValuesResult.trend, 'stagnant');
assert.deepStrictEqual(nullValuesResult.significantChanges, []);

// Edge case: all metrics stable (no significant change)
const stableInput = [
  { date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50 } },
  { date: '2024-01-08', metrics: { weight: 100.5, bodyFat: 24.9, cardioEndurance: 50.5 } },
  { date: '2024-01-15', metrics: { weight: 100.2, bodyFat: 25.1, cardioEndurance: 49.8 } }
];
const stableResult = analyzeProgressTrends(stableInput, 'hypertrophy');
assert.strictEqual(stableResult.trend, 'stagnant');
assert.strictEqual(stableResult.significantChanges.length, 0);

// Edge case: strength exercises with significant increase
const strengthIncreaseInput = [
  { date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50, strengthScores: { bench: 100 } } },
  { date: '2024-02-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50, strengthScores: { bench: 150 } } }
];
const strengthIncreaseResult = analyzeProgressTrends(strengthIncreaseInput, 'strength');
assert.strictEqual(strengthIncreaseResult.trend, 'improving');
assert.ok(strengthIncreaseResult.significantChanges.some(c => c.metric === 'strength_bench' && c.direction === 'increase'));

// Aggressive fat loss (smoke: must not throw, must return a well-formed object)
const aggressiveLossInput = [
  { date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50 } },
  { date: '2024-01-08', metrics: { weight: 95, bodyFat: 23, cardioEndurance: 55 } },
  { date: '2024-01-15', metrics: { weight: 90, bodyFat: 21, cardioEndurance: 60 } }
];
const aggressiveLossResult = analyzeProgressTrends(aggressiveLossInput, 'fat_loss');
assert.ok(aggressiveLossResult && typeof aggressiveLossResult.trend === 'string');
assert.ok(Array.isArray(aggressiveLossResult.recommendations) && aggressiveLossResult.recommendations.length > 0);

// Edge case: declining trend in hypertrophy phase (strength falling >0.05 normalized)
const decliningInput = [
  { date: '2024-01-01', metrics: { weight: 100, bodyFat: 25, cardioEndurance: 50, strengthScores: { bench: 100 } } },
  { date: '2024-01-08', metrics: { weight: 98, bodyFat: 26, cardioEndurance: 48, strengthScores: { bench: 95 } } },
  { date: '2024-01-15', metrics: { weight: 96, bodyFat: 27, cardioEndurance: 46, strengthScores: { bench: 90 } } }
];
const decliningResult = analyzeProgressTrends(decliningInput, 'hypertrophy');
assert.strictEqual(decliningResult.trend, 'declining');
assert.ok(decliningResult.recommendations.some(r => r.includes('deload') || r.includes('nutrition')));

console.log('ok');
