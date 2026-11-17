const test = require('node:test');
const assert = require('node:assert/strict');

const Engine = require('../js/adaptation-engine.js');
const SessionBuilder = require('../js/session-builder.js');
const Profile = require('../js/profile.js');

const mockCatalog = [
  {
    id: 'push_ups_1',
    he: 'שכיבות סמיכה',
    muscles: ['chest', 'triceps'],
    primary: 'chest',
    equipment: 'none',
    level: 'beginner',
    file: 'pushups.mp4'
  },
  {
    id: 'bench_press_1',
    he: 'לחיצת חזה במשקולות',
    muscles: ['chest', 'shoulders'],
    primary: 'chest',
    equipment: 'dumbbells',
    level: 'intermediate',
    file: 'bench.mp4'
  },
  {
    id: 'chest_fly_1',
    he: 'פרפר חזה בגומייה',
    muscles: ['chest'],
    primary: 'chest',
    equipment: 'band',
    level: 'beginner',
    file: 'fly.mp4'
  },
  {
    id: 'squat_1',
    he: 'סקוואט משקל גוף',
    muscles: ['legs', 'glutes'],
    primary: 'legs',
    equipment: 'none',
    level: 'beginner',
    file: 'squat.mp4'
  },
  {
    id: 'lunge_1',
    he: 'מכרעים',
    muscles: ['legs'],
    primary: 'legs',
    equipment: 'none',
    level: 'beginner',
    file: 'lunge.mp4'
  },
  {
    id: 'leg_press_1',
    he: 'לחיצת רגליים',
    muscles: ['legs'],
    primary: 'legs',
    equipment: 'machine',
    level: 'intermediate',
    file: 'legpress.mp4'
  },
  {
    id: 'biceps_curl_1',
    he: 'כפיפת מרפקים במשקולות',
    muscles: ['arms', 'biceps'],
    primary: 'arms',
    equipment: 'dumbbells',
    level: 'beginner',
    file: 'curl.mp4'
  },
  {
    id: 'triceps_ext_1',
    he: 'פשיטת מרפקים כנגד גומייה',
    muscles: ['arms', 'triceps'],
    primary: 'arms',
    equipment: 'band',
    level: 'beginner',
    file: 'triext.mp4'
  },
  {
    id: 'hammer_curl_1',
    he: 'כפיפת פטיש',
    muscles: ['arms', 'biceps'],
    primary: 'arms',
    equipment: 'dumbbells',
    level: 'beginner',
    file: 'hammer.mp4'
  }
];

// -----------------------------------------------------------------------------
// 1. no spot-reduction wording in promiseLimits
// -----------------------------------------------------------------------------
test('no spot-reduction wording in promiseLimits: local fat loss is not promised and framed as systemic', () => {
  const muscles = ['chest', 'legs', 'arms', 'back', 'shoulders', 'core', 'full_body'];

  for (const m of muscles) {
    const template = Engine.DEFAULT_TEMPLATES[m];
    assert.ok(template, `template for ${m} must exist`);

    const pLimits = template.promiseLimits;
    assert.ok(typeof pLimits === 'string' && pLimits.length > 0, `promiseLimits for ${m} must be non-empty`);

    // Must clarify no spot reduction / local fat loss not promised
    assert.ok(
      /ללא הבטחה להורדת שומן מקומית|איבוד שומן מקומי אינו מובטח|אינו מוריד שומן מקומי|אינם שורפים שומן מקומי/i.test(
        pLimits
      ),
      `promiseLimits for ${m} must explicitly deny local spot reduction: "${pLimits}"`
    );

    // Must not make spot reduction promises like "שורף שומן באזור" or "מוריד שומן מהידיים/בטן"
    assert.ok(
      !/ישרוף שומן באזור|יוריד שומן מהזרוע בלבד|ממיס שומן/i.test(pLimits),
      `promiseLimits for ${m} must not promise local fat melting`
    );
  }

  // Verify report adaptation for fat_loss goal reinforces systemic fat loss
  const report = Engine.buildAdaptationReport({ goal: 'שימור שריר בירידה בשומן', focus: 'chest' }, null);
  assert.ok(
    report.promiseLimits.includes('תהליך מערכתי') || report.promiseLimits.includes('כלל-גופי'),
    `promiseLimits in fat loss report must emphasize systemic fat loss: "${report.promiseLimits}"`
  );
  assert.ok(
    report.promiseLimits.includes('ללא הבטחה להורדת שומן מקומית'),
    'promiseLimits must retain core no-spot-reduction guarantee'
  );
});

// -----------------------------------------------------------------------------
// 2. somatotype wording
// -----------------------------------------------------------------------------
test('somatotype wording: somatotype treated as a description not destiny and does not dictate prescription', () => {
  const muscles = ['chest', 'legs', 'arms', 'back', 'shoulders', 'core', 'full_body'];

  for (const m of muscles) {
    const t = Engine.DEFAULT_TEMPLATES[m];

    // basedOn must describe somatotype as description of state, not biological destiny
    assert.ok(
      t.basedOn.includes('תיאור מצב') && t.basedOn.includes('לא גורל ביולוגי'),
      `basedOn for ${m} must frame somatotype as description not destiny: "${t.basedOn}"`
    );

    // personalAdaptation must specify adaptation by observed ability/comfort, not body label
    assert.ok(
      t.personalAdaptation.includes('ולא בגלל תווית גוף'),
      `personalAdaptation for ${m} must state adaptation is not by body label: "${t.personalAdaptation}"`
    );

    // Must NOT prescribe using the banned somatotype terms (ectomorph, mesomorph, endomorph)
    const fullText = JSON.stringify(t);
    assert.ok(
      !/אקטומורף|מזומורף|אנדומורף|ectomorph|mesomorph|endomorph/i.test(fullText),
      `template for ${m} must not use naive somatotype labels as prescription`
    );
  }

  // Rule R20 in RESEARCH_RULES explicitly governs somatotype
  const r20 = Engine.RESEARCH_RULES.R20;
  assert.ok(r20, 'Rule R20 must exist in RESEARCH_RULES');
  assert.ok(r20.description.includes('תיאור מצב ולא גורל ביולוגי'), 'Rule R20 must state description not destiny');
});

// -----------------------------------------------------------------------------
// 3. weekly volume range per focus
// -----------------------------------------------------------------------------
test('weekly volume range per focus: progression guided by weekly hard-set volume ranges and RIR', () => {
  const chestRules = Engine.researchRulesFor('chest');
  assert.equal(chestRules.weeklyVolumeRange.min, 8);
  assert.equal(chestRules.weeklyVolumeRange.max, 12);
  assert.equal(chestRules.weeklyVolumeRange.target, 10);
  assert.ok(
    Engine.DEFAULT_TEMPLATES.chest.howToProgress.includes('8–12') ||
      Engine.DEFAULT_TEMPLATES.chest.howToProgress.includes('8-12'),
    'chest template howToProgress must mention 8-12 weekly sets'
  );

  const legsRules = Engine.researchRulesFor('legs');
  assert.equal(legsRules.weeklyVolumeRange.min, 8);
  assert.equal(legsRules.weeklyVolumeRange.max, 14);
  assert.ok(
    Engine.DEFAULT_TEMPLATES.legs.howToProgress.includes('8–14') ||
      Engine.DEFAULT_TEMPLATES.legs.howToProgress.includes('8-14'),
    'legs template howToProgress must mention 8-14 weekly sets'
  );

  const armsRules = Engine.researchRulesFor('arms');
  assert.equal(armsRules.weeklyVolumeRange.min, 6);
  assert.equal(armsRules.weeklyVolumeRange.max, 10);
  assert.ok(
    Engine.DEFAULT_TEMPLATES.arms.howToProgress.includes('6–10') ||
      Engine.DEFAULT_TEMPLATES.arms.howToProgress.includes('6-10'),
    'arms template howToProgress must mention 6-10 weekly sets'
  );

  // How to progress must also mention RIR (2-3 reps in reserve)
  assert.ok(
    Engine.DEFAULT_TEMPLATES.chest.howToProgress.includes('RIR') ||
      Engine.DEFAULT_TEMPLATES.chest.howToProgress.includes('רזרבה'),
    'howToProgress must guide progression with RIR'
  );

  // Volume budget computation with 0.5 indirect sets
  const session = {
    phases: [
      {
        name: 'Main',
        exercises: [
          { name: 'לחיצת חזה', sets: 4, primary: 'chest' },
          { name: 'סקוואט', sets: 4, primary: 'legs' }
        ]
      }
    ]
  };
  const budget = Engine.calculateWeeklyVolumeBudget(session);
  assert.equal(budget.chest.direct, 4);
  assert.equal(budget.legs.direct, 4);
  assert.equal(budget.triceps.indirect, 2); // 4 * 0.5 indirect from chest
  assert.equal(budget.anchor, 10);
});

// -----------------------------------------------------------------------------
// 4. howToMeasure content
// -----------------------------------------------------------------------------
test('howToMeasure content: measurement by waist, photos, and strength trends rather than daily weight', () => {
  const muscles = ['chest', 'legs', 'arms', 'back', 'shoulders', 'core', 'full_body'];

  for (const m of muscles) {
    const t = Engine.DEFAULT_TEMPLATES[m];
    const measure = t.howToMeasure;

    assert.ok(measure.includes('היקף מותן'), `howToMeasure for ${m} must include waist circumference: "${measure}"`);
    assert.ok(measure.includes('תמונות'), `howToMeasure for ${m} must include progress photos: "${measure}"`);
    assert.ok(
      measure.includes('כוח') || measure.includes('ביצועים'),
      `howToMeasure for ${m} must include strength/performance trends: "${measure}"`
    );
    assert.ok(
      measure.includes('שקילה יומית'),
      `howToMeasure for ${m} must warn against reliance on daily weight: "${measure}"`
    );
  }

  const report = Engine.buildAdaptationReport({ focus: 'arms' }, null);
  assert.ok(report.howToMeasure.includes('היקף מותן'), 'report howToMeasure must include waist circumference');
  assert.ok(report.howToMeasure.includes('תמונות'), 'report howToMeasure must include photos');
  assert.ok(report.howToMeasure.includes('שקילה יומית'), 'report howToMeasure must warn against daily scale reliance');
});

// -----------------------------------------------------------------------------
// 5. researchRulesFor for chest/legs/arms
// -----------------------------------------------------------------------------
test('researchRulesFor pure helper returns rule sets for chest, legs, arms', () => {
  // Chest
  const chest = Engine.researchRulesFor('chest');
  assert.equal(chest.focus, 'chest');
  assert.equal(chest.hebrewName, 'חזה');
  assert.equal(chest.noSpotReduction, true);
  assert.equal(chest.somatotypeIsDestiny, false);
  assert.equal(chest.weeklyVolumeRange.target, 10);
  assert.ok(chest.hasRule('R1'));
  assert.ok(chest.hasRule('R11')); // indirect sets rule
  assert.ok(chest.hasRule('R19')); // target region without spot reduction
  assert.ok(chest.hasRule('R20')); // somatotype descriptive
  assert.equal(chest.indirectContributions.triceps, 0.5);

  // Hebrew alias "חזה"
  const chestHebrew = Engine.researchRulesFor('חזה');
  assert.equal(chestHebrew.focus, 'chest');
  assert.deepEqual(chestHebrew.ruleIds, chest.ruleIds);

  // Legs
  const legs = Engine.researchRulesFor('legs');
  assert.equal(legs.focus, 'legs');
  assert.equal(legs.hebrewName, 'רגליים');
  assert.equal(legs.noSpotReduction, true);
  assert.equal(legs.somatotypeIsDestiny, false);
  assert.equal(legs.weeklyVolumeRange.min, 8);
  assert.equal(legs.weeklyVolumeRange.max, 14);
  assert.ok(legs.hasRule('R1'));
  assert.ok(legs.hasRule('R19'));
  assert.ok(legs.hasRule('R20'));

  // Arms
  const arms = Engine.researchRulesFor('arms');
  assert.equal(arms.focus, 'arms');
  assert.equal(arms.hebrewName, 'ידיים');
  assert.equal(arms.noSpotReduction, true);
  assert.equal(arms.somatotypeIsDestiny, false);
  assert.equal(arms.weeklyVolumeRange.min, 6);
  assert.equal(arms.weeklyVolumeRange.max, 10);
  assert.ok(arms.hasRule('R11'));
  assert.ok(arms.hasRule('R19'));

  // Fallback for null or unknown focus returns full_body safe rules
  const fallback = Engine.researchRulesFor(null);
  assert.equal(fallback.focus, 'full_body');
  assert.ok(fallback.hasRule('R1'));
  assert.ok(fallback.hasRule('R20'));
});

// -----------------------------------------------------------------------------
// 6. session-builder passes focus
// -----------------------------------------------------------------------------
test('session-builder passes profile focus and goal so adaptation report uses research rules', () => {
  // Case A: Prompt without focus, profile specifies focus: "chest" and goal: "בניית שריר"
  const resultChest = SessionBuilder.buildSession('אימון 20 דקות', mockCatalog, {
    profile: {
      focus: 'chest',
      goal: 'בניית שריר'
    }
  });

  assert.ok(resultChest.workout, 'workout must be built');
  assert.equal(resultChest.workout.focus, 'chest');
  assert.equal(resultChest.workout.goal, 'בניית שריר');

  const reportChest = resultChest.workout.adaptationReport;
  assert.ok(reportChest, 'adaptationReport must be attached to workout');
  assert.equal(reportChest.targetMuscle, 'chest');
  assert.ok(reportChest.goal.includes('חזה'), `report goal should focus on chest: "${reportChest.goal}"`);
  assert.ok(reportChest.researchRules.hasRule('R19'), 'report should include rule R19 for target region');
  assert.equal(reportChest.researchRules.weeklyVolumeRange.target, 10);

  // Case B: Profile specifies legs focus
  const resultLegs = SessionBuilder.buildSession('אימון 20 דקות', mockCatalog, {
    profile: {
      focus: 'legs',
      goal: 'שימור שריר בירידה בשומן'
    }
  });

  assert.equal(resultLegs.workout.focus, 'legs');
  const reportLegs = resultLegs.workout.adaptationReport;
  assert.equal(reportLegs.targetMuscle, 'legs');
  assert.ok(reportLegs.goal.includes('רגליים') || reportLegs.goal.includes('רגלים'));
  assert.ok(reportLegs.promiseLimits.includes('ללא הבטחה להורדת שומן מקומית'));

  // Case C: Empty picked clips passes profile focus to emptyAdaptationReport
  const resultEmpty = SessionBuilder.buildSession('אימון ללא התאמה', [], {
    profile: {
      focus: 'arms',
      goal: 'כוח ותפקוד'
    }
  });
  assert.equal(resultEmpty.satisfied, false);
  assert.ok(resultEmpty.adaptationReport, 'emptyAdaptationReport must be present');
  assert.equal(resultEmpty.adaptationReport.targetMuscle, 'arms');
  assert.ok(resultEmpty.adaptationReport.goal.includes('זרועות'));
});

// -----------------------------------------------------------------------------
// 7. Profile module personalization fields and validation (F1-F17)
// -----------------------------------------------------------------------------
test('Profile.normalizePersonalizationProfile validates 17 research fields and preserves unsourced gaps as config', () => {
  const raw = {
    sex: 'male',
    age: 32,
    heightCm: 178,
    weightKg: 78,
    waistCm: 84,
    hipCm: 98,
    bodyFatPct: 18,
    bodyFatMethod: 'skinfold',
    experience: 'intermediate',
    goal: 'hypertrophy',
    targetRegion: ['chest', 'arms'],
    daysPerWeek: 4,
    equipment: ['dumbbells', 'bench'],
    limitations: ['shoulder_impingement'],
    sleepHours: 7.5,
    perfTrend: 'up',
    medicalFlag: false,
    cardioPref: 'steady',
    somatotype: 'mesomorph_descriptive'
  };

  const norm = Profile.normalizePersonalizationProfile(raw);
  assert.equal(norm.sex, 'male');
  assert.equal(norm.age, 32);
  assert.equal(norm.heightCm, 178);
  assert.equal(norm.weightKg, 78);
  assert.equal(norm.waistCm, 84);
  assert.equal(norm.hipCm, 98);
  // WHR derived: 84 / 98 ≈ 0.86
  assert.equal(norm.whr, 0.86);
  assert.equal(norm.bodyFatPct, 18);
  assert.equal(norm.bodyFatMethod, 'skinfold');
  assert.equal(norm.experience, 'intermediate');
  assert.equal(norm.goal, 'hypertrophy');
  assert.deepEqual(norm.targetRegion, ['chest', 'arms']);
  assert.deepEqual(norm.equipment, ['dumbbells', 'bench']);
  assert.deepEqual(norm.limitations, ['shoulder_impingement']);
  assert.equal(norm.daysPerWeek, 4);
  assert.equal(norm.sleepHours, 7.5);
  assert.equal(norm.perfTrend, 'up');
  assert.equal(norm.cardioPref, 'steady');
  assert.equal(norm.somatotype, 'mesomorph_descriptive');

  // Unsourced gaps are present as TODO/config
  assert.ok(Profile.UNSOURCED_GAPS, 'UNSOURCED_GAPS config must exist');
  assert.equal(Profile.UNSOURCED_GAPS.highBodyFatThreshold, 'TODO/config');
  assert.equal(Profile.UNSOURCED_GAPS.leanThreshold, 'TODO/config');

  // Existing normalizeProfile behavior is strictly preserved
  const standardProfile = Profile.normalizeProfile(raw);
  assert.deepEqual(Object.keys(standardProfile).sort(), ['equipment', 'limitations']);
  assert.deepEqual(standardProfile.equipment, ['dumbbells', 'bench']);
  assert.deepEqual(standardProfile.limitations, ['shoulder_impingement']);
});
