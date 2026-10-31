const { test } = require('node:test');
const { strictEqual } = require('node:assert');
const { claimsOutcome } = require('../js/analyzer.js');
const R = require('../js/rules-with-sources.js');

// A dumbbell or kettlebell weight is a load. The rules panel told the coach that
// «אימון רגליים עם משקולות 5 ק"ג» promised a result, while «אימון לירידה במשקל» passed.
test('a stated load in kilograms is not an outcome claim', () => {
  ['אימון רגליים עם משקולות 5 ק"ג', 'גובלט סקוואט עם קטלבל 12 ק״ג', 'אימון חזה עם דמבלים של 8 קילוגרם']
    .forEach((t) => strictEqual(claimsOutcome(t), false, t));
  const rule = R.rulesWithSources('אימון רגליים עם משקולות 5 ק"ג').rules.find((x) => x.id === 'no_outcome_claims');
  strictEqual(rule.value, 'התוכנית מתארת עומס ולא מבטיחה תוצאה גופנית');
});

test('weight-loss promises are still caught, with or without kilograms', () => {
  ['אימון לירידה במשקל', 'אימון להורדה במשקל', 'אימון להרזיה', 'תרזה 5 ק"ג', 'תוכנית לרדת 5 קילו', 'ירידה של 3 ק"ג בחודש']
    .forEach((t) => strictEqual(claimsOutcome(t), true, t));
});
