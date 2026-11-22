'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const THRules = require('../js/rules-with-sources.js');
const THEngine = require('../js/session-builder.js');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'js/rules-with-sources.js'), 'utf8');

const FULL = 'אימון בטן למתחילים של 45 דקות בלי ציוד ל-12 חניכים למטרת כוח';

function byId(result, id) {
  return result.rules.filter(function (r) { return r.id === id; })[0];
}

test('rulesWithSources returns every workout rule with a named source', function () {
  const result = THRules.rulesWithSources(FULL);

  assert.equal(result.description, FULL);
  assert.ok(Array.isArray(result.rules));
  assert.equal(result.rules.length, THRules.RULE_IDS.length);
  assert.ok(result.rules.length >= 8, 'a plan is built from at least 8 assumptions');
  assert.deepEqual(result.rules.map(function (r) { return r.id; }), THRules.RULE_IDS);

  for (const rule of result.rules) {
    assert.equal(typeof rule.id, 'string', 'rule id');
    assert.ok(rule.he.length > 0, rule.id + ' has a Hebrew description');
    assert.ok(rule.detail.length > 0, rule.id + ' explains itself');
    assert.ok(String(rule.value).length > 0, rule.id + ' has a value');
    assert.ok(rule.source && typeof rule.source === 'object', rule.id + ' has a source');
    assert.ok(THRules.SOURCES[rule.source.id], rule.id + ' points at a known source');
    assert.ok(rule.source.he.length > 0, rule.id + ' source is named in Hebrew');
    assert.ok(rule.source.kind.length > 0, rule.id + ' source has a kind');
  }

  const ids = result.rules.map(function (r) { return r.id; });
  assert.equal(new Set(ids).size, ids.length, 'rule ids are unique');
  for (const expected of ['duration', 'exercise_count', 'focus', 'goal', 'prescription',
    'equipment', 'level', 'participants', 'no_outcome_claims']) {
    assert.ok(ids.includes(expected), 'missing rule: ' + expected);
  }

  const listed = result.sources.map(function (s) { return s.id; });
  assert.equal(new Set(listed).size, listed.length, 'the source list has no duplicates');
  assert.equal(result.sources[0].id, result.rules[0].source.id);
  assert.ok(result.sources.every(function (s) { return s && THRules.SOURCES[s.id]; }));
  for (const rule of result.rules) {
    assert.ok(listed.includes(rule.source.id), rule.id + ' source is listed in result.sources');
  }
});

test('a rule taken from the request is credited to the request, a filled-in one to the default', function () {
  const asked = THRules.rulesWithSources(FULL);
  const bare = THRules.rulesWithSources('אימון');

  assert.equal(byId(asked, 'duration').source.id, 'prompt');
  assert.equal(byId(asked, 'duration').value, '45 דקות');
  assert.equal(byId(bare, 'duration').source.id, 'default');
  assert.equal(byId(bare, 'duration').value, '20 דקות');

  assert.equal(byId(asked, 'level').source.id, 'prompt');
  assert.equal(byId(asked, 'level').value, 'מתחיל');
  assert.equal(byId(bare, 'level').source.id, 'default');

  assert.equal(byId(asked, 'equipment').source.id, 'prompt');
  assert.equal(byId(asked, 'equipment').value, 'משקל גוף');
  assert.equal(byId(bare, 'equipment').source.id, 'catalog');

  assert.equal(byId(asked, 'focus').source.id, 'prompt');
  assert.equal(byId(asked, 'focus').value, 'ליבה');
  assert.equal(byId(bare, 'focus').source.id, 'default');
  assert.equal(byId(bare, 'focus').value, 'גוף מלא — לא זוהתה קבוצת שריר בתיאור');

  assert.equal(byId(asked, 'goal').source.id, 'prompt');
  assert.equal(byId(asked, 'goal').value, 'כוח');
  assert.equal(byId(bare, 'goal').source.id, 'default');

  assert.equal(byId(asked, 'participants').source.id, 'prompt');
  assert.match(byId(asked, 'participants').value, /12/);
  assert.match(byId(asked, 'participants').value, /תחנות/);
  assert.equal(byId(bare, 'participants').source.id, 'default');
  assert.equal(byId(bare, 'participants').value, '1 חניך — בלי חלוקה לתחנות');
});

test('engine rules quote the numbers the engine actually runs', function () {
  const asked = THRules.rulesWithSources(FULL);

  const prescription = byId(asked, 'prescription');
  const rx = THEngine.prescription({ goal: 'strength', focus: 'core' });
  assert.equal(prescription.source.id, 'engine');
  assert.equal(prescription.value, '4 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים');

  const count = byId(asked, 'exercise_count');
  assert.equal(count.source.id, 'engine');
  assert.equal(count.value, THEngine.wantedCount(45, rx) + ' תרגילים לאימון של 45 דקות');

  // A core-only request has no explicit goal, so the engine derives the prescription from the focus.
  const core = THRules.rulesWithSources('אימון בטן');
  assert.equal(byId(core, 'goal').source.id, 'engine');
  assert.equal(byId(core, 'prescription').value, '3 סטים × 40 שנ׳ עבודה · 30 שנ׳ מנוחה בין סטים');
});

test('the honesty rule is always shown and names the outcome promise it blocks', function () {
  const clean = byId(THRules.rulesWithSources('אימון גב'), 'no_outcome_claims');
  assert.equal(clean.source.id, 'policy');
  assert.equal(clean.value, 'התוכנית מתארת עומס ולא מבטיחה תוצאה גופנית');

  const claim = byId(THRules.rulesWithSources('אימון שורף שומן מהר'), 'no_outcome_claims');
  assert.equal(claim.source.id, 'policy');
  assert.equal(claim.value, 'התיאור כלל הבטחת תוצאה — היא לא נכנסת לתוכנית, מוצג עומס בלבד');
  assert.notEqual(claim.value, clean.value, 'a request that promises an outcome is called out');
});

test('every source that cites a file cites a file that exists and defines exact fields', function () {
  assert.deepEqual(THRules.SOURCES.prompt, {
    id: 'prompt',
    kind: 'user',
    he: 'מה שביקשת',
    detail: 'נקרא מתוך התיאור והשדות שמילאת.',
    ref: null
  });
  assert.deepEqual(THRules.SOURCES.engine, {
    id: 'engine',
    kind: 'engine',
    he: 'טבלה קבועה במנוע',
    detail: 'מספרים שכתובים בקוד ורצים אותו דבר בכל אימון.',
    ref: 'js/session-builder.js'
  });
  assert.deepEqual(THRules.SOURCES.default, {
    id: 'default',
    kind: 'default',
    he: 'ברירת מחדל של TrainerHub',
    detail: 'לא ביקשת — השלמנו, ואפשר לשנות בשדות שמעל.',
    ref: 'js/rules-with-sources.js'
  });
  assert.deepEqual(THRules.SOURCES.catalog, {
    id: 'catalog',
    kind: 'catalog',
    he: 'המאגר שלך',
    detail: 'נקבע לפי הסרטונים שקיימים אצלך במאגר.',
    ref: 'js/catalog.json'
  });
  assert.deepEqual(THRules.SOURCES.policy, {
    id: 'policy',
    kind: 'policy',
    he: 'כלל היושרה של TrainerHub',
    detail: 'חוסם הבטחת תוצאה גופנית בכל תוכנית.',
    ref: 'js/analyzer.js'
  });

  const refs = Object.keys(THRules.SOURCES).map(function (id) { return THRules.SOURCES[id].ref; });
  assert.ok(refs.filter(Boolean).length >= 3, 'at least three sources cite a file');
  for (const ref of refs) {
    if (!ref) continue;
    assert.equal(fs.existsSync(path.join(root, ref)), true, ref + ' should exist');
  }
});

test('findRule looks a single rule up by id or by words from its description and boundary', function () {
  const byKey = THRules.findRule(FULL, 'prescription');
  assert.ok(byKey);
  assert.equal(byKey.id, 'prescription');
  assert.ok(byKey.source.he.length > 0, 'a single rule still carries its source');

  assert.equal(THRules.findRule(FULL, 'prescription').id, 'prescription');
  assert.equal(THRules.findRule(FULL, '  prescription  ').id, 'prescription');
  assert.equal(THRules.findRule(FULL, 'מנוחה').id, 'prescription');
  assert.equal(THRules.findRule(FULL, 'משך האימון').id, 'duration');
  assert.equal(THRules.findRule(FULL, 'ציוד').id, 'equipment');
  assert.equal(THRules.findRule(FULL, 'מדרגות קבועות').id, 'exercise_count');
  assert.equal(THRules.findRule(FULL, 'האפליקציה לא מודדת').id, 'no_outcome_claims');
  // Matching across detail and value boundary separated by space
  assert.equal(THRules.findRule(FULL, 'מודדת. התוכנית').id, 'no_outcome_claims');
  assert.equal(THRules.findRule(FULL, 'תחנות').id, 'participants');
  assert.equal(THRules.findRule(FULL, 'כלל שלא קיים בכלל'), null);
  assert.equal(THRules.findRule(FULL, ''), null);
  assert.equal(THRules.findRule(FULL, '   '), null);
  assert.equal(THRules.findRule(FULL, null), null);
  assert.equal(THRules.findRule(FULL, undefined), null);
});

test('rulesWithSources accepts a parsed request or a built session, not only text', function () {
  const built = THEngine.buildSession('אימון בטן של 45 דקות');
  const fromSession = THRules.rulesWithSources(built);
  const fromRequest = THRules.rulesWithSources(built.request);

  assert.equal(byId(fromSession, 'duration').value, byId(fromRequest, 'duration').value);
  assert.equal(byId(fromSession, 'duration').source.id, 'prompt');
  assert.equal(fromSession.rules.length, THRules.RULE_IDS.length);

  const empty = THRules.rulesWithSources();
  assert.equal(empty.rules.length, THRules.RULE_IDS.length);
  assert.equal(byId(empty, 'duration').source.id, 'default');
  assert.equal(empty.description, '');

  const fromNull = THRules.rulesWithSources(null);
  assert.equal(fromNull.rules.length, THRules.RULE_IDS.length);
  assert.equal(fromNull.description, '');
});

test('rulesMarkup renders every rule with its source and escapes the description', function () {
  const result = THRules.rulesWithSources(FULL);
  const html = THRules.rulesMarkup(FULL);

  assert.match(html, /<section class="card rules" aria-labelledby="rulesTitle">/);
  assert.match(html, /<h2 id="rulesTitle">הנחות האימון ומקורותיהן<\/h2>/);
  assert.match(html, /<p class="honest">כל כלל שהמנוע הפעיל על הבקשה הזו, ומאיפה הוא בא\. עברו על הרשימה לפני שמתחילים\.<\/p>/);
  assert.ok(html.includes('<p class="rules-for">נבנה לפי הבקשה: «' + TH.esc(FULL) + '»</p>'));
  assert.match(html, /<ul class="rules-list">/);
  assert.ok(html.includes('</li><li class="rule" data-rule-id="'));
  assert.match(html, /<\/ul><\/section>$/);

  for (const rule of result.rules) {
    assert.ok(html.includes('data-rule-id="' + rule.id + '"'), 'markup is missing rule ' + rule.id);
    assert.ok(html.includes('<b>' + TH.esc(rule.he) + '</b>'), 'markup is missing the name of ' + rule.id);
    assert.ok(html.includes('<span class="rule-value">' + TH.esc(rule.value) + '</span>'), 'markup is missing the value of ' + rule.id);
    assert.ok(html.includes('<span class="pill rule-source">מקור: ' + TH.esc(rule.source.he) + '</span>'), 'markup is missing the source of ' + rule.id);
    assert.ok(html.includes('<small class="rule-detail">'), 'markup is missing detail container for ' + rule.id);
  }

  const attack = THRules.rulesMarkup('<img src=x onerror=alert(1)> אימון גב');
  assert.doesNotMatch(attack, /<img/);
  assert.match(attack, /&lt;img/);

  // Custom options and precomputed result
  const custom = THRules.rulesMarkup(result, {
    title: 'כותרת חלופית',
    className: 'custom-rules-panel'
  });
  assert.match(custom, /<section class="custom-rules-panel" aria-labelledby="rulesTitle">/);
  assert.match(custom, /<h2 id="rulesTitle">כותרת חלופית<\/h2>/);

  // Empty description skips the asked paragraph
  const noDescHtml = THRules.rulesMarkup({ rules: result.rules, description: '' });
  assert.doesNotMatch(noDescHtml, /class="rules-for"/);
  assert.ok(noDescHtml.includes('<h2 id="rulesTitle">הנחות האימון ומקורותיהן</h2><p class="honest">כל כלל שהמנוע הפעיל על הבקשה הזו, ומאיפה הוא בא. עברו על הרשימה לפני שמתחילים.</p><ul class="rules-list">'));
});

test('focus rule detects excludedMuscles, full body variations, and default fallback', function () {
  // Excluded muscles
  const excluded = THRules.rulesWithSources({
    raw: 'אימון בלי רגליים',
    muscles: [],
    excludedMuscles: ['legs']
  });
  const exFocus = byId(excluded, 'focus');
  assert.equal(exFocus.source.id, 'prompt');
  assert.equal(exFocus.value, 'גוף מלא בלי רגליים');

  // FULL_BODY_RX variations
  const variants = [
    'אימון פולבודי',
    'אימון פול בודי',
    'אימון פול-בודי',
    'אימון fullbody',
    'אימון full body',
    'אימון full-body',
    'אימון גוף מלא',
    'אימון כל הגוף'
  ];
  for (const v of variants) {
    const res = THRules.rulesWithSources(v);
    const r = byId(res, 'focus');
    assert.equal(r.source.id, 'prompt', 'source for ' + v);
    assert.equal(r.value, 'גוף מלא', 'value for ' + v);
  }

  // Bare fallback
  const bare = THRules.rulesWithSources({ raw: 'סתם טקסט', muscles: [], excludedMuscles: [] });
  const bareFocus = byId(bare, 'focus');
  assert.equal(bareFocus.source.id, 'default');
  assert.equal(bareFocus.value, 'גוף מלא — לא זוהתה קבוצת שריר בתיאור');

  // Explicit muscles with unmapped fallback
  const customMuscle = THRules.rulesWithSources({
    raw: 'אימון',
    muscles: ['chest', 'unknown_muscle']
  });
  assert.equal(byId(customMuscle, 'focus').source.id, 'prompt');
  assert.equal(byId(customMuscle, 'focus').value, 'חזה, unknown_muscle');
});

test('goal rule covers hypertrophy, endurance, core, strength, unmapped goals and core derivation', function () {
  const hypertrophy = THRules.rulesWithSources({ raw: 'אימון', goal: 'hypertrophy' });
  assert.equal(byId(hypertrophy, 'goal').source.id, 'prompt');
  assert.equal(byId(hypertrophy, 'goal').value, 'מסת שריר');

  const endurance = THRules.rulesWithSources({ raw: 'אימון', goal: 'endurance' });
  assert.equal(byId(endurance, 'goal').source.id, 'prompt');
  assert.equal(byId(endurance, 'goal').value, 'סיבולת');

  const corePrompt = THRules.rulesWithSources({ raw: 'אימון', goal: 'core' });
  assert.equal(byId(corePrompt, 'goal').source.id, 'prompt');
  assert.equal(byId(corePrompt, 'goal').value, 'ליבה וייצוב');

  const unmapped = THRules.rulesWithSources({ raw: 'אימון', goal: 'power' });
  assert.equal(byId(unmapped, 'goal').source.id, 'prompt');
  assert.equal(byId(unmapped, 'goal').value, 'power');

  // Default without goal and without core focus
  const def = THRules.rulesWithSources({ raw: 'אימון כללי', focus: 'full', muscles: [] });
  assert.equal(byId(def, 'goal').source.id, 'default');
  assert.equal(byId(def, 'goal').value, 'מסת שריר');

  // Core-only derived goal
  const coreDerived = THRules.rulesWithSources({ raw: 'אימון בטן', focus: 'core', muscles: ['core'] });
  assert.equal(byId(coreDerived, 'goal').source.id, 'engine');
  assert.equal(byId(coreDerived, 'goal').value, 'ליבה וייצוב — נגזר מהמיקוד שביקשת');
});

test('duration and exercise count handle single-minute format and catalog shortages', function () {
  // 1 minute duration
  const oneMin = THRules.rulesWithSources({ raw: 'אימון קצר', duration: 1, durationSpecified: true });
  assert.equal(byId(oneMin, 'duration').source.id, 'prompt');
  assert.equal(byId(oneMin, 'duration').value, 'דקה');
  assert.equal(byId(oneMin, 'exercise_count').value, '3 תרגילים לאימון של דקה');

  // Shortage in catalog (main.length < want)
  const want = THEngine.wantedCount(30, THEngine.prescription({ goal: 'hypertrophy', focus: 'full' }));
  const shortWorkout = {
    workout: {
      phases: [
        {
          name: 'Main',
          exercises: [
            { name: 'תרגיל 1', sets: 3 },
            { name: 'תרגיל 2', sets: 3 }
          ]
        }
      ]
    },
    duration: 30,
    durationSpecified: true
  };
  const shortResult = THRules.rulesWithSources(shortWorkout);
  const countRule = byId(shortResult, 'exercise_count');
  assert.ok(want > 2, 'wanted exercises should be more than 2');
  assert.equal(countRule.value, want + ' תרגילים לאימון של 30 דקות — במאגר נמצאו רק 2');

  // When main.length >= want, no shortage note is added
  const fullExercises = [];
  for (let i = 0; i < want; i++) fullExercises.push({ name: 'תרגיל ' + i, sets: 3 });
  const exactWorkout = {
    workout: { phases: [{ name: 'Main', exercises: fullExercises }] },
    duration: 30,
    durationSpecified: true
  };
  const exactResult = THRules.rulesWithSources(exactWorkout);
  assert.equal(byId(exactResult, 'exercise_count').value, want + ' תרגילים לאימון של 30 דקות');
  assert.equal(byId(exactResult, 'prescription').value, '3 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים');
  assert.doesNotMatch(byId(exactResult, 'prescription').value, /קוצר/);
});

test('prescription rule evaluates fitted sets, single-set, duration-based work, and reduced sets', function () {
  // Case A: Last exercises lost a set, sets - 1 === 1 (e.g. max sets 2, lower sets 1)
  const workoutSet1 = {
    request: { duration: 20, focus: 'full', goal: 'hypertrophy' },
    workout: {
      phases: [
        {
          name: 'Main',
          exercises: [
            { name: 'תרגיל 1', sets: 2 },
            { name: 'תרגיל 2', sets: 1 }
          ]
        }
      ]
    }
  };
  const res1 = THRules.rulesWithSources(workoutSet1);
  const rx1 = byId(res1, 'prescription');
  assert.equal(rx1.value, '2 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים — ב-1 מתוך 2 התרגילים סט אחד, כדי שייכנס בזמן');

  // Case B: Last exercises lost a set, sets - 1 > 1 (rx.sets 4, max sets 3, lower sets 2)
  const workoutSet2 = {
    request: { duration: 30, focus: 'full', goal: 'strength' },
    workout: {
      phases: [
        null,
        { name: 'Warm-up', exercises: [{ name: 'WarmupEx', sets: 1 }] },
        {
          name: 'Main',
          exercises: [
            { name: 'תרגיל 1', sets: 3 },
            { name: 'תרגיל 2', sets: 3 },
            { name: 'תרגיל 3', sets: 2 }
          ]
        }
      ]
    }
  };
  const res2 = THRules.rulesWithSources(workoutSet2);
  const rx2 = byId(res2, 'prescription');
  assert.equal(rx2.value, '3 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים — ב-1 מתוך 3 התרגילים 2 סטים, כדי שייכנס בזמן');

  // Case C: All exercises shortened equally: fewer === 0 and sets < rx.sets
  const rxTable = THEngine.prescription({ goal: 'hypertrophy', focus: 'full' });
  const reducedWorkout = {
    request: { duration: 30, focus: 'full', goal: 'hypertrophy' },
    workout: {
      phases: [
        {
          name: 'Main',
          exercises: [
            { name: 'תרגיל 1', sets: rxTable.sets - 1 },
            { name: 'תרגיל 2', sets: rxTable.sets - 1 }
          ]
        }
      ]
    }
  };
  const res3 = THRules.rulesWithSources(reducedWorkout);
  const rx3 = byId(res3, 'prescription');
  assert.equal(rx3.value, (rxTable.sets - 1) + ' סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים — קוצר מ-' + rxTable.sets + ' סטים כדי שייכנס בזמן');

  // Case D: Single set prescription with time duration instead of reps
  const singleSetTimeWorkout = {
    request: { duration: 20, focus: 'core', goal: null },
    workout: {
      phases: [
        {
          name: 'Main',
          exercises: [
            { name: 'פלנק', sets: 1 }
          ]
        }
      ]
    }
  };
  const res4 = THRules.rulesWithSources(singleSetTimeWorkout);
  const rx4 = byId(res4, 'prescription');
  assert.equal(rx4.value, 'סט אחד × 40 שנ׳ עבודה · 30 שנ׳ מנוחה אחרי הסט — קוצר מ-3 סטים כדי שייכנס בזמן');
});

test('equipment and level rules handle mappings, custom values, and empty values', function () {
  // Empty equipment -> catalog
  const emptyEq = THRules.rulesWithSources({ raw: 'אימון', equipment: [] });
  assert.equal(byId(emptyEq, 'equipment').source.id, 'catalog');
  assert.equal(byId(emptyEq, 'equipment').value, 'לפי מה שיש במאגר');

  // Mapped and unmapped equipment
  const mixedEq = THRules.rulesWithSources({ raw: 'אימון', equipment: ['dumbbells', 'bar', 'kettlebell_custom'] });
  assert.equal(byId(mixedEq, 'equipment').source.id, 'prompt');
  assert.equal(byId(mixedEq, 'equipment').value, 'משקולות, מתח, kettlebell_custom');

  // Empty level -> default
  const emptyLvl = THRules.rulesWithSources({ raw: 'אימון', level: null });
  assert.equal(byId(emptyLvl, 'level').source.id, 'default');
  assert.equal(byId(emptyLvl, 'level').value, 'לא צוינה — בלי סינון לפי רמה');

  // Mapped levels
  const beg = THRules.rulesWithSources({ raw: 'אימון', level: 'beginner' });
  assert.equal(byId(beg, 'level').source.id, 'prompt');
  assert.equal(byId(beg, 'level').value, 'מתחיל');

  const inter = THRules.rulesWithSources({ raw: 'אימון', level: 'intermediate' });
  assert.equal(byId(inter, 'level').source.id, 'prompt');
  assert.equal(byId(inter, 'level').value, 'ביניים');

  const adv = THRules.rulesWithSources({ raw: 'אימון', level: 'advanced' });
  assert.equal(byId(adv, 'level').source.id, 'prompt');
  assert.equal(byId(adv, 'level').value, 'מתקדם');

  const customLvl = THRules.rulesWithSources({ raw: 'אימון', level: 'expert' });
  assert.equal(byId(customLvl, 'level').source.id, 'prompt');
  assert.equal(byId(customLvl, 'level').value, 'expert');
});

test('participants rule handles single participant, custom group plans, and fallback', function () {
  // 1 participant
  const single = THRules.rulesWithSources({ raw: 'אימון', participants: 1, participantsSpecified: true });
  assert.equal(byId(single, 'participants').value, '1 חניך — בלי חלוקה לתחנות');
  assert.equal(byId(single, 'participants').source.id, 'prompt');

  // 0 participants clamped to 1
  const zero = THRules.rulesWithSources({ raw: 'אימון', participants: 0 });
  assert.equal(byId(zero, 'participants').value, '1 חניך — בלי חלוקה לתחנות');

  // Workout with group_plan.he already present
  const withPlan = THRules.rulesWithSources({
    participants: 10,
    participantsSpecified: true,
    workout: {
      group_plan: { he: '3 תחנות של 3-4 חניכים' }
    }
  });
  assert.equal(byId(withPlan, 'participants').value, '3 תחנות של 3-4 חניכים');

  // Workout with main exercises used for group plan calculation
  const withMain = THRules.rulesWithSources({
    participants: 8,
    workout: {
      phases: [
        {
          name: 'Main',
          exercises: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]
        }
      ]
    }
  });
  assert.match(byId(withMain, 'participants').value, /תחנות/);

  // Fallback when groupPlan returns null or plan without he
  const origGroupPlan = THEngine.groupPlan;
  try {
    THEngine.groupPlan = function () { return null; };
    const fallbackNull = THRules.rulesWithSources({ participants: 5, participantsSpecified: true });
    assert.equal(byId(fallbackNull, 'participants').value, '5 חניכים');

    THEngine.groupPlan = function () { return {}; };
    const fallbackNoHe = THRules.rulesWithSources({ participants: 7, participantsSpecified: true });
    assert.equal(byId(fallbackNoHe, 'participants').value, '7 חניכים');
  } finally {
    THEngine.groupPlan = origGroupPlan;
  }
});

test('toRequest normalizes various shapes of input and defaults', function () {
  // Request wrapped inside { request: ... }
  const wrapped = THRules.rulesWithSources({
    request: {
      raw: 'אימון',
      muscles: ['legs'],
      excludedMuscles: ['biceps'],
      focus: 'legs',
      duration: 35,
      durationSpecified: true,
      participants: 6,
      participantsSpecified: true,
      equipment: ['mat'],
      level: 'intermediate',
      goal: 'strength'
    }
  });
  assert.equal(wrapped.request.raw, 'אימון');
  assert.deepEqual(wrapped.request.muscles, ['legs']);
  assert.deepEqual(wrapped.request.excludedMuscles, ['biceps']);
  assert.equal(wrapped.request.focus, 'legs');
  assert.equal(wrapped.request.duration, 35);
  assert.equal(wrapped.request.durationSpecified, true);
  assert.equal(wrapped.request.participants, 6);
  assert.equal(wrapped.request.participantsSpecified, true);
  assert.deepEqual(wrapped.request.equipment, ['mat']);
  assert.equal(wrapped.request.level, 'intermediate');
  assert.equal(wrapped.request.goal, 'strength');

  // Non-object request field
  const invalidReq = THRules.rulesWithSources({
    request: 'invalid string',
    raw: 'טקסט ישיר',
    workout: 'not an object'
  });
  assert.equal(invalidReq.request.raw, 'טקסט ישיר');

  // Malformed input properties normalized to safe defaults
  const malformed = THRules.rulesWithSources({
    raw: null,
    muscles: 'not-array',
    excludedMuscles: 'not-array',
    focus: '',
    duration: 'not-number',
    durationSpecified: 0,
    participants: -10,
    participantsSpecified: 0,
    equipment: 'not-array',
    level: '',
    goal: ''
  });
  assert.equal(malformed.request.raw, '');
  assert.deepEqual(malformed.request.muscles, []);
  assert.deepEqual(malformed.request.excludedMuscles, []);
  assert.equal(malformed.request.focus, 'full');
  assert.equal(malformed.request.duration, 20);
  assert.equal(malformed.request.durationSpecified, false);
  assert.equal(malformed.request.participants, 1);
  assert.equal(malformed.request.participantsSpecified, false);
  assert.deepEqual(malformed.request.equipment, []);
  assert.equal(malformed.request.level, null);
  assert.equal(malformed.request.goal, null);
});

test('ruleMarkup renders reference when present and omits reference when absent', function () {
  const res = THRules.rulesWithSources(FULL);
  const promptRule = byId(res, 'duration'); // ref is null
  const engineRule = byId(res, 'exercise_count'); // ref is 'js/session-builder.js'

  const htmlPrompt = THRules.rulesMarkup({ description: 'test', rules: [promptRule] });
  assert.doesNotMatch(htmlPrompt, /·/);
  assert.ok(htmlPrompt.includes('<small class="rule-detail">' + promptRule.detail + ' ' + promptRule.source.detail + '</small></li>'));

  const htmlEngine = THRules.rulesMarkup({ description: 'test', rules: [engineRule] });
  assert.match(htmlEngine, /· js\/session-builder\.js/);
});

test('rulesMarkup invokes Core.esc when available', function () {
  let called = false;
  const origEsc = TH.esc;
  TH.esc = function (s) {
    called = true;
    return origEsc(s);
  };
  try {
    THRules.rulesMarkup('test');
    assert.ok(called, 'Core.esc should be called');
  } finally {
    TH.esc = origEsc;
  }
});

test('built-in esc fallback handles special characters and null when Core has no esc', function () {
  const origEsc = TH.esc;
  TH.esc = undefined;
  try {
    const markup = THRules.rulesMarkup('test & <tag> "quotes" \'apostrophe\'');
    assert.ok(markup.includes('&amp;'), 'escapes &');
    assert.ok(markup.includes('&lt;tag&gt;'), 'escapes < and >');
    assert.ok(markup.includes('&quot;quotes&quot;'), 'escapes "');
    assert.ok(markup.includes('&#39;apostrophe&#39;'), "escapes '");

    const htmlNull = THRules.rulesMarkup({
      description: null,
      rules: [{ id: 'null_rule', he: 'כלל', value: null, detail: 'פירוט', source: { id: 's', he: 's', detail: 's', ref: null } }]
    });
    assert.doesNotMatch(htmlNull, /Stryker/);
    assert.ok(htmlNull.includes('<span class="rule-value"></span>'));
    assert.doesNotMatch(htmlNull, /<span class="rule-value">null<\/span>/);
  } finally {
    TH.esc = origEsc;
  }
});

test('rxText handles zero duration fallback when reps is falsy', function () {
  const origPrescription = THEngine.prescription;
  try {
    THEngine.prescription = function () {
      return { sets: 2, reps: null, duration: 0, rest: 30 };
    };
    const res = THRules.rulesWithSources({ raw: 'אימון', goal: 'core' });
    const rx = byId(res, 'prescription');
    assert.ok(rx.value.includes('40 שנ׳ עבודה'));
  } finally {
    THEngine.prescription = origPrescription;
  }
});

test('UMD wrapper runs in window, globalThis, and bare context without node module', function () {
  // 1. In browser window context (distinct window from globalThis)
  const fakeWin = {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: require('../js/core.js')
  };
  const windowCtx = Object.assign({}, globalThis, {
    window: fakeWin,
    globalThis: {}
  });
  vm.runInNewContext(scriptSource, windowCtx);
  assert.ok(fakeWin.THRules, 'THRules attached to window');

  // 2. In globalThis context without window (distinct globalThis from this)
  const fakeGlob = {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: require('../js/core.js')
  };
  const globalCtx = Object.assign({}, globalThis, {
    window: undefined,
    globalThis: fakeGlob
  });
  vm.runInNewContext(scriptSource, globalCtx);
  assert.ok(fakeGlob.THRules, 'THRules attached to globalThis');

  // 3. In bare context without window or globalThis (falls back to `this`)
  const bareCtx = Object.assign({}, globalThis, {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: require('../js/core.js')
  });
  vm.runInNewContext('(function () { var window; var globalThis; ' + scriptSource + ' }).call(this)', bareCtx);
  assert.ok(bareCtx.THRules);
  assert.ok(typeof bareCtx.THRules.rulesWithSources === 'function');
});

test('core exposes the rules API so every page can show them', function () {
  assert.equal(typeof TH.rulesWithSources, 'function');
  assert.equal(typeof TH.findRule, 'function');
  assert.equal(typeof TH.rulesMarkup, 'function');
  assert.equal(TH.rulesWithSources(FULL).rules.length, THRules.RULE_IDS.length);
  assert.equal(TH.findRule(FULL, 'duration').id, 'duration');
  assert.match(TH.rulesMarkup(FULL), /data-rule-id="duration"/);
});

test('rulesWithSources handles workouts without Main phase and function inputs', function () {
  // Workout whose phases contain no Main phase
  const noMainWorkout = {
    workout: {
      phases: [
        { name: 'Warm-up', exercises: [{ name: 'קפיצות', sets: 1 }] }
      ]
    }
  };
  const resNoMain = THRules.rulesWithSources(noMainWorkout);
  assert.equal(byId(resNoMain, 'prescription').source.id, 'engine');
  assert.doesNotMatch(byId(resNoMain, 'prescription').value, /קוצר/);

  // Function input with a workout property should be ignored (not treated as an input object)
  const fnInput = function () {};
  fnInput.workout = {
    phases: [
      { name: 'Main', exercises: [{ name: 'A', sets: 1 }] }
    ]
  };
  const resFn = THRules.rulesWithSources(fnInput);
  assert.equal(byId(resFn, 'prescription').source.id, 'engine');
  assert.doesNotMatch(byId(resFn, 'prescription').value, /קוצר/);
});

test('the main page loads the rules module and renders the panel', function () {
  assert.match(indexHtml, /js\/rules-with-sources\.js/);
  assert.match(indexHtml, /TH\.rulesMarkup/);
  assert.match(indexHtml, /הנחות האימון/);
  assert.match(indexHtml, /\.rule-source/, 'the panel is styled on the page');
  // The panel must sit above the actions, so the rules can be read before the plan is started.
  assert.ok(indexHtml.indexOf('rulesMarkup') < indexHtml.indexOf('id="startBtn"'));
});
