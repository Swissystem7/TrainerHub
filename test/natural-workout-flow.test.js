const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const Infer = require('../js/infer.js');
const Prompt = require('../js/prompt-parser.js');
const Flow = require('../js/natural-workout-flow.js');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));

test('פענוח אימון חזה וציוד: מזהה שרירי מטרה, משך זמן ומשקולות', () => {
  const prompt = 'אימון חזה עם משקולות ל-30 דקות';
  const result = Flow.generateFromNaturalPrompt(prompt, null, catalog);

  assert.ok(result);
  assert.equal(result.success, true);
  assert.ok(result.parsed);
  assert.ok(result.parsed.muscles.includes('chest'));
  assert.ok(result.parsed.equipment.includes('dumbbells'));
  assert.equal(result.parsed.duration, 30);

  assert.ok(result.workout);
  assert.equal(result.workout.duration_minutes, 30);
  assert.ok(Array.isArray(result.workout.phases));

  const mainPhase = result.workout.phases.find((p) => p.name === 'Main');
  assert.ok(mainPhase);
  assert.ok(mainPhase.exercises.length > 0);
});

test('זיהוי מגבלת קפיצות: מזהה low impact ומסנן תרגילי ניתור וקפיצה מהאימון', () => {
  const prompt = 'אימון רגליים 25 דקות ללא קפיצות';
  const result = Flow.generateFromNaturalPrompt(prompt, null, catalog);

  assert.ok(result);
  assert.ok(result.parsed);
  assert.ok(result.parsed.limitations.includes('no_jumps'));
  assert.ok(result.personalization);
  assert.ok(result.personalization.appliedAdaptations.some((a) => a.includes('קפיצות')));

  // Verify that none of the generated exercises in the workout are jumping/plyo exercises
  const allExercises = [];
  (result.workout.phases || []).forEach((p) => {
    (p.exercises || []).forEach((ex) => {
      allExercises.push(ex);
    });
  });

  const jumpRegex = /קפיצ|ניתור|בורפי|גאמפינג|jump|burpee/i;
  for (const ex of allExercises) {
    assert.equal(
      jumpRegex.test(ex.name),
      false,
      `Exercise ${ex.name} contains jumping but jumping limitation was requested`
    );
  }
});

test('אימון ריק/null מחזיר fallback בטוח: טיפול עמיד ללא קריסות', () => {
  const nullResult = Flow.generateFromNaturalPrompt(null, null, catalog);
  assert.ok(nullResult);
  assert.equal(nullResult.success, true);
  assert.ok(nullResult.workout);
  assert.ok(nullResult.workout.title);
  assert.equal(nullResult.workout.duration_minutes, 20);
  assert.ok(Array.isArray(nullResult.workout.phases));
  assert.ok(nullResult.workout.phases.length > 0);

  const emptyResult = Flow.generateFromNaturalPrompt('', null, catalog);
  assert.ok(emptyResult);
  assert.equal(emptyResult.success, true);
  assert.ok(emptyResult.workout);
  assert.ok(emptyResult.workout.title);

  const undefinedCatalogResult = Flow.generateFromNaturalPrompt('אימון כללי', null, null);
  assert.ok(undefinedCatalogResult);
  assert.ok(undefinedCatalogResult.workout);

  // Fallback trigger via empty object catalog
  const fallbackRes = Flow.generateFromNaturalPrompt('אימון ללא קפיצות', null, {
    ex1: { id: 'j1', pattern: 'plyo', name: 'jump' }
  });
  assert.ok(fallbackRes);
  assert.equal(fallbackRes.fallbackUsed, true);
  assert.ok(fallbackRes.workout);
  assert.equal(fallbackRes.workout.source, 'natural-flow-fallback');
  assert.equal(fallbackRes.workout.phases.length, 3);
});

test('אינטגרציה עם infer: שילוב הסקת רמות, מגבלות ותוויות שריר וציוד', () => {
  assert.equal(typeof Infer.inferLevel, 'function');
  assert.equal(typeof Infer.inferRestrictions, 'function');
  assert.equal(typeof Infer.inferLimitations, 'function');
  assert.ok(Infer.RESTRICTION_LABELS);

  assert.equal(Infer.inferLevel('אימון מתקדם'), 'advanced');
  assert.equal(Infer.inferLevel('אימון למתחילים'), 'beginner');

  const restrictions = Infer.inferRestrictions('אימון עם בעיות ברכיים ובלי קפיצות');
  assert.ok(restrictions.includes('no_jumps'));
  assert.ok(restrictions.includes('knee_pain'));

  const parsed = Prompt.parsePrompt('אימון חזה 20 דקות בלי ניתורים');
  assert.ok(parsed.restrictions.includes('no_jumps'));

  const flowResult = Flow.generateFromNaturalPrompt('אימון מתקדם לרגליים', null, catalog);
  assert.equal(flowResult.parsed.level, 'advanced');
});

test('בניית סיכום תגים: formatParsedSummary מייצר תגי הבנה ברורים', () => {
  const parsed = {
    muscles: ['chest'],
    focus: 'chest',
    duration: 30,
    equipment: ['dumbbells'],
    level: 'beginner',
    limitations: ['no_jumps'],
    goal: 'כוח'
  };

  const summary = Flow.formatParsedSummary(parsed);
  assert.ok(Array.isArray(summary));
  assert.ok(summary.length >= 5);

  const summaryText = summary.join(' | ');
  assert.ok(summaryText.includes('חזה'));
  assert.ok(summaryText.includes('30 דק׳'));
  assert.ok(summaryText.includes('משקולות'));
  assert.ok(summaryText.includes('מתחיל'));
  assert.ok(summaryText.includes('ללא קפיצות'));

  // Test badges array property
  assert.ok(Array.isArray(summary.badges));
  assert.ok(summary.badges.some((b) => b.key === 'muscles'));
  assert.ok(summary.badges.some((b) => b.key === 'duration'));

  // Safe fallback for null
  const fallbackSummary = Flow.formatParsedSummary(null);
  assert.ok(Array.isArray(fallbackSummary));
  assert.ok(fallbackSummary.length > 0);

  const focusOnlyParsed = { focus: 'chest', duration: 15 };
  const focusSummary = Flow.formatParsedSummary(focusOnlyParsed);
  assert.ok(focusSummary.join(' | ').includes('חזה'));

  const emptyEqParsed = { muscles: ['back'], equipment: [] };
  const eqSummary = Flow.formatParsedSummary(emptyEqParsed);
  assert.ok(eqSummary.join(' | ').includes('ללא ציוד'));
});

test('הגבלת משך חריג: נרמול זמנים שליליים, אפס או חריגים מעל 120 דקות', () => {
  assert.equal(Flow.clampDuration(300), 120);
  assert.equal(Flow.clampDuration(150), 120);
  assert.equal(Flow.clampDuration(0), 20);
  assert.equal(Flow.clampDuration(-15), 20);
  assert.equal(Flow.clampDuration(NaN), 20);
  assert.equal(Flow.clampDuration(2), 5);
  assert.equal(Flow.clampDuration(45), 45);

  const highRes = Flow.generateFromNaturalPrompt('אימון של 300 דקות', null, catalog);
  assert.equal(highRes.workout.duration_minutes, 120);

  const zeroRes = Flow.generateFromNaturalPrompt('אימון של 0 דקות', null, catalog);
  assert.equal(zeroRes.workout.duration_minutes, 20);
});

test('קיום הממשק ב-frontend/index.html: אלמנטים, תגים ותסריט זרימה', () => {
  const htmlPath = path.join(root, 'frontend', 'index.html');
  const content = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(content.includes('id="naturalPromptInput"'), 'naturalPromptInput textarea exists');
  assert.ok(content.includes('id="generateFromPromptBtn"'), 'generateFromPromptBtn button exists');
  assert.ok(content.includes('id="parsedPromptBadges"'), 'parsedPromptBadges region exists');

  assert.ok(content.includes('js/natural-workout-flow.js'), 'natural-workout-flow script included');
  assert.ok(content.includes('generateFromNaturalPrompt'), 'calls generateFromNaturalPrompt in frontend script');
  assert.ok(content.includes('formatParsedSummary'), 'calls formatParsedSummary in frontend script');
  assert.ok(content.includes('renderWorkoutDOM'), 'has createElement-based workout renderer');

  // Test UMD global browser attachment
  const flowCode = fs.readFileSync(path.join(root, 'js', 'natural-workout-flow.js'), 'utf8');
  const mockGlobal = { window: {}, THPrompt: Prompt, THInfer: Infer, THEngine: null, THCatalog: catalog };
  mockGlobal.window = mockGlobal;
  vm.createContext(mockGlobal);
  vm.runInContext(flowCode, mockGlobal);
  assert.ok(mockGlobal.THNaturalFlow);
  assert.equal(typeof mockGlobal.THNaturalFlow.generateFromNaturalPrompt, 'function');
});

test('התאמה אישית והנמקת בחירות: שילוב פרופיל משתמש והסבר על התאמות', () => {
  const profile = {
    equipment: ['bands'],
    limitations: ['no_jumps'],
    level: 'intermediate'
  };

  const result = Flow.generateFromNaturalPrompt('אימון כוח לרגליים', profile, catalog);

  assert.ok(result);
  assert.ok(result.personalization);
  assert.equal(result.personalization.profile, profile);
  assert.equal(result.parsed.level, 'intermediate');
  assert.ok(result.parsed.limitations.includes('no_jumps'));
  assert.ok(result.personalization.appliedAdaptations.length > 0);

  assert.ok(result.explanation);
  assert.ok(result.workout.personalization);
  assert.ok(result.workout.rationale);
});
