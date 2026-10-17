const { test } = require('node:test');
const assert = require('node:assert');
const THEngine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «גב» / «יד» נבדקו כתת־מחרוזת, אז «פלאנק גבוה» (ליבה) נכנס לאימון גב
// ו«פלאנק צידי» (ליבה) לאימון ידיים, עם הנימוק «השם והתיקייה מתאימים לבקשה».

function mainNames(prompt) {
  const built = THEngine.buildSession(prompt, catalog);
  assert.ok(built.workout, prompt);
  return built.workout.phases[1].exercises.map((e) => e.name);
}

test('«פלאנק גבוה» is not a back exercise', () => {
  const names = mainNames('אימון גב 30 דקות משקל גוף');
  assert.ok(!names.includes('פלאנק גבוה'), names.join(' | '));
  assert.ok(names.includes('כתפיים וגב'), names.join(' | '));
});

test('«פלאנק צידי» is not an arms exercise', () => {
  for (const prompt of ['אימון ידיים 45 דקות משקל גוף', 'אימון ידיים 60 דקות']) {
    const names = mainNames(prompt);
    assert.ok(!names.includes('פלאנק צידי'), prompt + ': ' + names.join(' | '));
    assert.ok(names.includes('זוגות ידיים'), prompt + ': ' + names.join(' | '));
  }
});

test('word hints still read «הגב» / «יד אחת»', () => {
  const back = { focus: 'back', muscles: ['back'] };
  const arms = { focus: 'arms', muscles: ['biceps', 'triceps'] };
  const onBack = { id: 'x', he: 'חימום שכיבות שמיכה קונוסים על הגב', muscles: ['triceps'] };
  const oneArm = { id: 'y', he: 'עבודה עם יד אחת', muscles: ['core'] };
  const high = { id: 'z', he: 'פלאנק גבוה', muscles: ['core'] };
  const side = { id: 'w', he: 'פלאנק צידי', muscles: ['core'] };
  assert.ok(THEngine.scoreEntry(onBack, back) > THEngine.scoreEntry(high, back));
  assert.ok(THEngine.scoreEntry(oneArm, arms) > THEngine.scoreEntry(side, arms));
});
