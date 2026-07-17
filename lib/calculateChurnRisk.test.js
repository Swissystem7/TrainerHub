const assert = require('node:assert');
const { calculateChurnRisk } = require('./calculateChurnRisk.js');

// Dates are anchored to "now" because the spec's trend window ("last month vs
// previous 3 months") is evaluated relative to the current date. Fixed literal
// dates would fall outside the window and make trend detection untestable.
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// 1. Normal case with sufficient data -> well-formed shape.
const history1 = [
  { date: daysAgo(80), attendance: 1, programAdherence: 0.8, communication: 'high' },
  { date: daysAgo(40), attendance: 1, programAdherence: 0.9, communication: 'high' },
  { date: daysAgo(5),  attendance: 1, programAdherence: 0.85, communication: 'medium' }
];
const result1 = calculateChurnRisk(history1, { age: 35, tenureMonths: 12 });
assert.strictEqual(typeof result1.churnProbability, 'number');
assert.ok(result1.churnProbability >= 0 && result1.churnProbability <= 1);
assert.ok(['low', 'medium', 'high'].includes(result1.riskLevel));
assert.ok(Array.isArray(result1.contributingFactors));

// 2. null history -> insufficient data.
assert.deepStrictEqual(
  calculateChurnRisk(null, { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] }
);

// 3. empty history -> insufficient data.
assert.deepStrictEqual(
  calculateChurnRisk([], { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] }
);

// 4. all entries null attendance/adherence + 'none' communication -> insufficient data.
const history4 = [
  { date: daysAgo(40), attendance: null, programAdherence: null, communication: 'none' },
  { date: daysAgo(10), attendance: null, programAdherence: null, communication: 'none' }
];
assert.deepStrictEqual(
  calculateChurnRisk(history4, { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] }
);

// 5. all dates invalid -> filtered out -> insufficient data.
const history5 = [{ date: 'invalid', attendance: 1, programAdherence: 0.8, communication: 'high' }];
assert.deepStrictEqual(
  calculateChurnRisk(history5, { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] }
);

// 6. single entry, 'none' communication + attendance false -> high risk (spec exception).
const history6 = [{ date: daysAgo(5), attendance: false, programAdherence: null, communication: 'none' }];
assert.deepStrictEqual(
  calculateChurnRisk(history6, { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.85, riskLevel: 'high', contributingFactors: ['declining attendance', 'no recent communication'] }
);

// 7. single normal entry -> insufficient data (spec: one entry is insufficient unless the exception above).
const history7 = [{ date: daysAgo(5), attendance: 1, programAdherence: 0.9, communication: 'high' }];
assert.deepStrictEqual(
  calculateChurnRisk(history7, { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] }
);

// 8. declining attendance: high in the previous window, drops in the last month.
const history8 = [
  { date: daysAgo(75), attendance: 1, programAdherence: 0.8, communication: 'high' },
  { date: daysAgo(70), attendance: 1, programAdherence: 0.8, communication: 'high' },
  { date: daysAgo(3),  attendance: 0, programAdherence: 0.8, communication: 'high' }
];
const result8 = calculateChurnRisk(history8, { age: 35, tenureMonths: 12 });
assert.ok(result8.contributingFactors.includes('declining attendance'));

// 9. short tenure: needs >= 2 valid entries (a single entry is insufficient data per spec),
//    tenureMonths < 3 -> 'short tenure' factor.
const history9 = [
  { date: daysAgo(10), attendance: 1, programAdherence: 0.8, communication: 'high' },
  { date: daysAgo(3),  attendance: 1, programAdherence: 0.8, communication: 'high' }
];
const result9 = calculateChurnRisk(history9, { age: 30, tenureMonths: 1 });
assert.ok(result9.contributingFactors.includes('short tenure'));

// 10. stable engagement: no metric drops, tenure >= 3 -> 'stable engagement'.
const history10 = [
  { date: daysAgo(75), attendance: 1, programAdherence: 0.9, communication: 'high' },
  { date: daysAgo(70), attendance: 1, programAdherence: 0.9, communication: 'high' },
  { date: daysAgo(3),  attendance: 1, programAdherence: 0.9, communication: 'high' }
];
const result10 = calculateChurnRisk(history10, { age: 35, tenureMonths: 12 });
assert.ok(result10.contributingFactors.includes('stable engagement'));

// 11. missing demographics -> defaults (age 30, tenure 0), not "insufficient data":
//     valid multi-entry data still yields a computed numeric probability.
const result11 = calculateChurnRisk(history10, {});
assert.strictEqual(typeof result11.churnProbability, 'number');
assert.ok(result11.churnProbability >= 0 && result11.churnProbability <= 1);
assert.ok(['low', 'medium', 'high'].includes(result11.riskLevel));
// tenureMonths defaults to 0 (< 3), so short tenure must be flagged.
assert.ok(result11.contributingFactors.includes('short tenure'));

// 12. single entry with invalid communication -> insufficient data.
const history12 = [{ date: daysAgo(5), attendance: 1, programAdherence: 0.8, communication: 'invalid' }];
assert.deepStrictEqual(
  calculateChurnRisk(history12, { age: 30, tenureMonths: 6 }),
  { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] }
);

console.log('ok');
