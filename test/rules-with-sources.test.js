'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const THRules = require('../js/rules-with-sources.js');
const THEngine = require('../js/session-builder.js');
const THInfer = require('../js/infer.js');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

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
  for (const rule of result.rules) {
    assert.ok(listed.includes(rule.source.id), rule.id + ' source is listed in result.sources');
  }
});

test('SOURCES constant contains exact metadata and details for each source', function () {
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
});

test('a rule taken from the request is credited to the request, a filled-in one to the default', function () {
  const asked = THRules.rulesWithSources(FULL);
  const bare = THRules.rulesWithSources('אימון');

  assert.equal(byId(asked, 'duration').source.id, 'prompt');
  assert.match(byId(asked, 'duration').value, /45 דקות/);
  assert.equal(byId(bare, 'duration').source.id, 'default');
  assert.match(byId(bare, 'duration').value, /20 דקות/);

  assert.equal(byId(asked, 'level').source.id, 'prompt');
  assert.match(byId(asked, 'level').value, /מתחיל/);
  assert.equal(byId(bare, 'level').source.id, 'default');

  assert.equal(byId(asked, 'equipment').source.id, 'prompt');
  assert.match(byId(asked, 'equipment').value, /משקל גוף/);
  assert.equal(byId(bare, 'equipment').source.id, 'catalog');

  assert.equal(byId(asked, 'focus').source.id, 'prompt');
  assert.match(byId(asked, 'focus').value, /ליבה/);
  assert.equal(byId(bare, 'focus').source.id, 'default');
  assert.match(byId(bare, 'focus').value, /גוף מלא/);

  assert.equal(byId(asked, 'goal').source.id, 'prompt');
  assert.match(byId(asked, 'goal').value, /כוח/);
  assert.equal(byId(bare, 'goal').source.id, 'default');

  assert.equal(byId(asked, 'participants').source.id, 'prompt');
  assert.match(byId(asked, 'participants').value, /12/);
  assert.match(byId(asked, 'participants').value, /תחנות/);
  assert.equal(byId(bare, 'participants').source.id, 'default');
  assert.match(byId(bare, 'participants').value, /1/);
});

test('engine rules quote the numbers the engine actually runs', function () {
  const asked = THRules.rulesWithSources(FULL);

  const prescription = byId(asked, 'prescription');
  const rx = THEngine.prescription({ goal: 'strength', focus: 'core' });
  assert.equal(prescription.source.id, 'engine');
  assert.deepEqual(prescription.source, THRules.SOURCES.engine);
  assert.match(prescription.value, new RegExp(String(rx.sets) + ' סטים'));
  assert.match(prescription.value, new RegExp(rx.reps));
  assert.match(prescription.value, new RegExp(String(rx.rest)));

  const count = byId(asked, 'exercise_count');
  assert.equal(count.source.id, 'engine');
  assert.deepEqual(count.source, THRules.SOURCES.engine);
  assert.equal(count.value, THEngine.wantedCount(45, rx) + ' תרגילים לאימון של 45 דקות');

  // A core-only request has no explicit goal, so the engine derives the prescription from the focus.
  const core = THRules.rulesWithSources('אימון בטן');
  assert.equal(byId(core, 'goal').source.id, 'engine');
  assert.deepEqual(byId(core, 'goal').source, THRules.SOURCES.engine);
  assert.equal(byId(core, 'goal').value, 'ליבה וייצוב — נגזר מהמיקוד שביקשת');
  assert.match(byId(core, 'prescription').value, new RegExp(String(THEngine.prescription({ focus: 'core' }).rest)));
});

test('goal rule covers all goal types, unknown goals, and default hypertrophy', function () {
  const hyp = THRules.rulesWithSources({ goal: 'hypertrophy' });
  assert.equal(byId(hyp, 'goal').value, 'מסת שריר');
  assert.equal(byId(hyp, 'goal').source.id, 'prompt');

  const end = THRules.rulesWithSources({ goal: 'endurance' });
  assert.equal(byId(end, 'goal').value, 'סיבולת');
  assert.equal(byId(end, 'goal').source.id, 'prompt');

  const custom = THRules.rulesWithSources({ goal: 'power' });
  assert.equal(byId(custom, 'goal').value, 'power');
  assert.equal(byId(custom, 'goal').source.id, 'prompt');

  const def = THRules.rulesWithSources({ raw: 'אימון חזה' });
  assert.equal(byId(def, 'goal').value, 'מסת שריר');
  assert.equal(byId(def, 'goal').source.id, 'default');
});

test('focus rule handles full body synonyms, exclusions, multiple muscles, and defaults', function () {
  for (const phrase of ['פול בודי', 'פולבודי', 'גוף מלא', 'full body', 'fullbody', 'אימון לכל הגוף']) {
    const res = THRules.rulesWithSources(phrase);
    assert.equal(byId(res, 'focus').value, 'גוף מלא', phrase + ' should evaluate to גוף מלא');
    assert.equal(byId(res, 'focus').source.id, 'prompt', phrase + ' should have prompt source');
  }

  const multiMuscles = THRules.rulesWithSources({ muscles: ['chest', 'back'] });
  assert.equal(byId(multiMuscles, 'focus').value, 'חזה, גב');
  assert.equal(byId(multiMuscles, 'focus').source.id, 'prompt');

  const unknownMuscle = THRules.rulesWithSources({ muscles: ['custom_muscle'] });
  assert.equal(byId(unknownMuscle, 'focus').value, 'custom_muscle');

  const excluded = THRules.rulesWithSources({ excludedMuscles: ['legs'] });
  assert.equal(byId(excluded, 'focus').value, 'גוף מלא בלי רגליים');
  assert.equal(byId(excluded, 'focus').source.id, 'prompt');

  const multiExcluded = THRules.rulesWithSources({ excludedMuscles: ['legs', 'core'] });
  assert.equal(byId(multiExcluded, 'focus').value, 'גוף מלא בלי רגליים, ליבה');

  const noMuscle = THRules.rulesWithSources({ raw: 'סתם אימון' });
  assert.equal(byId(noMuscle, 'focus').value, 'גוף מלא — לא זוהתה קבוצת שריר בתיאור');
  assert.equal(byId(noMuscle, 'focus').source.id, 'default');
});

test('duration rule formats single minute vs multiple minutes and default fallback', function () {
  const oneMin = THRules.rulesWithSources({ duration: 1, durationSpecified: true });
  assert.equal(byId(oneMin, 'duration').value, 'דקה');
  assert.equal(byId(oneMin, 'duration').source.id, 'prompt');
  assert.match(byId(oneMin, 'exercise_count').value, /לאימון של דקה/);

  const oneMinDefault = THRules.rulesWithSources({ duration: 1, durationSpecified: false });
  assert.equal(byId(oneMinDefault, 'duration').value, 'דקה');
  assert.equal(byId(oneMinDefault, 'duration').source.id, 'default');

  const multiMin = THRules.rulesWithSources({ duration: 30, durationSpecified: true });
  assert.equal(byId(multiMin, 'duration').value, '30 דקות');
  assert.match(byId(multiMin, 'exercise_count').value, /לאימון של 30 דקות/);

  const invalidDuration = THRules.rulesWithSources({ duration: null, durationSpecified: false });
  assert.equal(byId(invalidDuration, 'duration').value, '20 דקות');
  assert.equal(byId(invalidDuration, 'duration').source.id, 'default');
});

test('equipment and level rules format known, multiple, unknown, and default values', function () {
  const multiEq = THRules.rulesWithSources({ equipment: ['dumbbells', 'bar'] });
  assert.equal(byId(multiEq, 'equipment').value, 'משקולות, מתח');
  assert.equal(byId(multiEq, 'equipment').source.id, 'prompt');

  const customEq = THRules.rulesWithSources({ equipment: ['kettlebell_x'] });
  assert.equal(byId(customEq, 'equipment').value, 'kettlebell_x');

  const emptyEq = THRules.rulesWithSources({ equipment: [] });
  assert.equal(byId(emptyEq, 'equipment').value, 'לפי מה שיש במאגר');
  assert.equal(byId(emptyEq, 'equipment').source.id, 'catalog');

  const begLevel = THRules.rulesWithSources({ level: 'beginner' });
  assert.equal(byId(begLevel, 'level').value, 'מתחיל');
  assert.equal(byId(begLevel, 'level').source.id, 'prompt');

  const advLevel = THRules.rulesWithSources({ level: 'advanced' });
  assert.equal(byId(advLevel, 'level').value, 'מתקדם');

  const customLevel = THRules.rulesWithSources({ level: 'olympic' });
  assert.equal(byId(customLevel, 'level').value, 'olympic');
  assert.equal(byId(customLevel, 'level').source.id, 'prompt');

  const noLevel = THRules.rulesWithSources({ level: null });
  assert.equal(byId(noLevel, 'level').value, 'לא צוינה — בלי סינון לפי רמה');
  assert.equal(byId(noLevel, 'level').source.id, 'default');
});

test('participants and stationsText cover single trainee, group plans, and fallbacks', function () {
  const solo = THRules.rulesWithSources({ participants: 1, participantsSpecified: true });
  assert.equal(byId(solo, 'participants').value, '1 חניך — בלי חלוקה לתחנות');
  assert.equal(byId(solo, 'participants').source.id, 'prompt');

  const zeroClamped = THRules.rulesWithSources({ participants: 0, participantsSpecified: false });
  assert.equal(byId(zeroClamped, 'participants').value, '1 חניך — בלי חלוקה לתחנות');
  assert.equal(byId(zeroClamped, 'participants').source.id, 'default');

  const explicitGroupPlan = THRules.rulesWithSources({
    request: { participants: 8, participantsSpecified: true },
    workout: { group_plan: { he: '2 תחנות של 4 חניכים' } }
  });
  assert.equal(byId(explicitGroupPlan, 'participants').value, '2 תחנות של 4 חניכים');
  assert.equal(byId(explicitGroupPlan, 'participants').source.id, 'prompt');

  // When groupPlan has no he property, falls back to "N חניכים"
  const origGroupPlan = THEngine.groupPlan;
  try {
    THEngine.groupPlan = function () { return null; };
    const noPlanHe = THRules.rulesWithSources({ participants: 5, participantsSpecified: true });
    assert.equal(byId(noPlanHe, 'participants').value, '5 חניכים');
  } finally {
    THEngine.groupPlan = origGroupPlan;
  }
});

test('exercise_count notes short catalog when workout has fewer main exercises than wanted', function () {
  const shortSession = {
    request: { duration: 45, durationSpecified: true },
    workout: {
      phases: [
        { name: 'Warm-up', exercises: [{ name: 'A' }] },
        { name: 'Main', exercises: [{ name: 'B' }, { name: 'C' }] }
      ]
    }
  };
  const res = THRules.rulesWithSources(shortSession);
  const want = THEngine.wantedCount(45, THEngine.prescription({}));
  assert.ok(want > 2);
  assert.equal(byId(res, 'exercise_count').value, want + ' תרגילים לאימון של 45 דקות — במאגר נמצאו רק 2');

  // When main.length === want exactly, no short note is added
  const exactCount = THEngine.wantedCount(20, THEngine.prescription({}));
  const exactSession = {
    request: { duration: 20, durationSpecified: false },
    workout: {
      phases: [
        { name: 'Main', exercises: Array.from({ length: exactCount }, function () { return { sets: 3 }; }) }
      ]
    }
  };
  const exactRes = THRules.rulesWithSources(exactSession);
  assert.equal(byId(exactRes, 'exercise_count').value, exactCount + ' תרגילים לאימון של 20 דקות');
  assert.doesNotMatch(byId(exactRes, 'exercise_count').value, /במאגר נמצאו רק/);
  assert.doesNotMatch(byId(exactRes, 'exercise_count').value, /Stryker/);

  // When main.length > want, no short note is added
  const fullSession = {
    request: { duration: 15, durationSpecified: true },
    workout: {
      phases: [
        { name: 'Main', exercises: Array.from({ length: 10 }, function () { return { name: 'E' }; }) }
      ]
    }
  };
  const fullRes = THRules.rulesWithSources(fullSession);
  assert.doesNotMatch(byId(fullRes, 'exercise_count').value, /במאגר נמצאו רק/);
});

test('prescription formatting handles timed exercises, single sets, fitSetsEach, and reduced sets', function () {
  // Timed exercise with 1 set: 'סט אחד' and 'שנ׳ מנוחה אחרי הסט'
  const origRx = THEngine.prescription;
  try {
    THEngine.prescription = function () {
      return { sets: 1, duration: 30, reps: null, rest: 20 };
    };
    const timedRes = THRules.rulesWithSources({ raw: 'אימון פלאנק' });
    assert.equal(byId(timedRes, 'prescription').value, 'סט אחד × 30 שנ׳ עבודה · 20 שנ׳ מנוחה אחרי הסט');

    // Default 40 seconds work when duration is null/0
    THEngine.prescription = function () {
      return { sets: 1, duration: 0, reps: null, rest: 15 };
    };
    const defSecRes = THRules.rulesWithSources({ raw: 'אימון פלאנק' });
    assert.equal(byId(defSecRes, 'prescription').value, 'סט אחד × 40 שנ׳ עבודה · 15 שנ׳ מנוחה אחרי הסט');

    // Multi-set reps exercise: '3 סטים' and 'שנ׳ מנוחה בין סטים'
    THEngine.prescription = function () {
      return { sets: 3, reps: '10-12', rest: 60 };
    };
    const repsRes = THRules.rulesWithSources({ raw: 'אימון חזה' });
    assert.equal(byId(repsRes, 'prescription').value, '3 סטים × 10-12 חזרות · 60 שנ׳ מנוחה בין סטים');
  } finally {
    THEngine.prescription = origRx;
  }

  // fitSetsEach branch: sets && fewer exercises have reduced sets
  // Case A: sets is 2, sets - 1 === 1 -> 'סט אחד'
  const fitSetsOne = {
    request: { goal: 'hypertrophy' },
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 2 }, { sets: 1 }] }
      ]
    }
  };
  const resOne = THRules.rulesWithSources(fitSetsOne);
  assert.equal(
    byId(resOne, 'prescription').value,
    '2 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים — ב-1 מתוך 2 התרגילים סט אחד, כדי שייכנס בזמן'
  );
  assert.deepEqual(byId(resOne, 'prescription').source, THRules.SOURCES.engine);

  // Case B: sets is 3, sets - 1 === 2 -> '2 סטים'
  const fitSetsTwo = {
    request: { goal: 'strength' },
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 3 }, { sets: 2 }, { sets: 3 }] }
      ]
    }
  };
  const resTwo = THRules.rulesWithSources(fitSetsTwo);
  assert.equal(
    byId(resTwo, 'prescription').value,
    '3 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים — ב-1 מתוך 3 התרגילים 2 סטים, כדי שייכנס בזמן'
  );

  // Reduced sets for all exercises: sets && sets < rx.sets (where fewer === 0)
  const allCut = {
    request: { goal: 'strength' }, // rx.sets is 4
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 2 }, { sets: 2 }] }
      ]
    }
  };
  const resCut = THRules.rulesWithSources(allCut);
  assert.equal(
    byId(resCut, 'prescription').value,
    '2 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים — קוצר מ-4 סטים כדי שייכנס בזמן'
  );
  assert.deepEqual(byId(resCut, 'prescription').source, THRules.SOURCES.engine);

  // When sets === rx.sets (and fewer === 0), no cut note is appended
  const normalSets = {
    request: { goal: 'hypertrophy' }, // rx.sets is 3
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 3 }, { sets: 3 }] }
      ]
    }
  };
  const resNormal = THRules.rulesWithSources(normalSets);
  assert.equal(byId(resNormal, 'prescription').value, '3 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים');
  assert.deepEqual(byId(resNormal, 'prescription').source, THRules.SOURCES.engine);
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

test('every source that cites a file cites a file that exists', function () {
  const refs = Object.keys(THRules.SOURCES).map(function (id) { return THRules.SOURCES[id].ref; });
  assert.ok(refs.filter(Boolean).length >= 3, 'at least three sources cite a file');
  for (const ref of refs) {
    if (!ref) continue;
    assert.equal(fs.existsSync(path.join(root, ref)), true, ref + ' should exist');
  }
});

test('findRule looks a single rule up by id or by words from its description', function () {
  const byKey = THRules.findRule(FULL, 'prescription');
  assert.ok(byKey);
  assert.equal(byKey.id, 'prescription');
  assert.ok(byKey.source.he.length > 0, 'a single rule still carries its source');

  // Match with whitespace trimmed
  assert.equal(THRules.findRule(FULL, '  duration  ').id, 'duration');
  assert.equal(THRules.findRule(FULL, 'מנוחה').id, 'prescription');
  assert.equal(THRules.findRule(FULL, 'משך האימון').id, 'duration');
  assert.equal(THRules.findRule(FULL, 'ציוד').id, 'equipment');
  // Match across detail and value boundary with space
  assert.equal(THRules.findRule(FULL, 'לתוכנית. 45').id, 'duration');
  // Match by words in rule detail or value
  assert.equal(THRules.findRule(FULL, 'הבטחת תוצאה').id, 'no_outcome_claims');
  assert.equal(THRules.findRule(FULL, 'מספרים שכתובים בקוד'), null); // source detail not in rule.detail
  assert.equal(THRules.findRule(FULL, 'עומס').id, 'no_outcome_claims');
  assert.equal(THRules.findRule(FULL, 'כלל שלא קיים בכלל'), null);
  assert.equal(THRules.findRule(FULL, ''), null);
  assert.equal(THRules.findRule(FULL, '   '), null);
  assert.equal(THRules.findRule(FULL), null);
  assert.equal(THRules.findRule(FULL, null), null);
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

  // Null and undefined inputs produce empty description
  assert.equal(THRules.rulesWithSources(null).description, '');
  assert.equal(THRules.rulesWithSources(undefined).description, '');

  // Non-object input falls back cleanly
  const fromNumber = THRules.rulesWithSources(123);
  assert.equal(fromNumber.description, '123');

  // Input object with null/non-object workout and raw properties
  const fromNulls = THRules.rulesWithSources({
    workout: 'not-an-object',
    raw: null,
    focus: null,
    muscles: null,
    excludedMuscles: null,
    equipment: null
  });
  assert.equal(fromNulls.description, '');
  assert.equal(fromNulls.request.focus, 'full');
  assert.deepEqual(fromNulls.request.equipment, []);
  assert.equal(byId(fromNulls, 'focus').source.id, 'default');

  // Input with request property that is not an object uses input itself
  const notObjReq = THRules.rulesWithSources({
    request: 'invalid-request',
    raw: 'שמירת תיאור מקורי'
  });
  assert.equal(notObjReq.description, 'שמירת תיאור מקורי');

  // Workout with Main phase where exercises is an object with length but not an array
  const nonArrEx = {
    workout: {
      phases: [{ name: 'Main', exercises: { length: 1 } }]
    }
  };
  assert.equal(byId(THRules.rulesWithSources(nonArrEx), 'exercise_count').value, '5 תרגילים לאימון של 20 דקות');

  // Workout without Main phase
  const noMainPhases = {
    workout: {
      phases: [{ name: 'Warm-up', exercises: [{ name: 'A' }] }]
    }
  };
  assert.equal(byId(THRules.rulesWithSources(noMainPhases), 'exercise_count').value, '5 תרגילים לאימון של 20 דקות');
});

test('rulesMarkup renders every rule with its source and escapes the description', function () {
  const result = THRules.rulesWithSources(FULL);
  const html = THRules.rulesMarkup(FULL);

  assert.match(html, /<section class="card rules" aria-labelledby="rulesTitle">/);
  assert.match(html, /<h2 id="rulesTitle">הנחות האימון ומקורותיהן<\/h2>/);
  assert.match(html, /<p class="honest">כל כלל שהמנוע הפעיל על הבקשה הזו, ומאיפה הוא בא\. עברו על הרשימה לפני שמתחילים\.<\/p>/);
  assert.ok(html.includes('<p class="rules-for">נבנה לפי הבקשה: «' + FULL + '»</p>'));
  assert.match(html, /<ul class="rules-list">/);
  assert.match(html, /<\/ul><\/section>$/);
  assert.match(html, /<\/li><li class="rule"/);
  assert.doesNotMatch(html, /Stryker/);

  for (const rule of result.rules) {
    const refSnippet = rule.source.ref ? ' · ' + TH.esc(rule.source.ref) : '';
    const exactRuleHtml = '<li class="rule" data-rule-id="' + TH.esc(rule.id) + '">' +
      '<b>' + TH.esc(rule.he) + '</b>' +
      '<span class="rule-value">' + TH.esc(rule.value) + '</span>' +
      '<span class="pill rule-source">מקור: ' + TH.esc(rule.source.he) + '</span>' +
      '<small class="rule-detail">' + TH.esc(rule.detail) + ' ' +
        TH.esc(rule.source.detail) + refSnippet + '</small>' +
      '</li>';
    assert.ok(html.includes(exactRuleHtml), 'markup is missing exact structure of ' + rule.id);
  }

  // Precomputed result input without description omits rules-for paragraph
  const precomputedHtml = THRules.rulesMarkup({ rules: result.rules, description: '' });
  assert.doesNotMatch(precomputedHtml, /class="rules-for"/);
  assert.doesNotMatch(precomputedHtml, /Stryker was here/);

  // Precomputed custom rules list is honored directly
  const customRule = {
    id: 'custom_rule',
    he: 'כלל מותאם',
    value: 'ערך מותאם',
    detail: 'פירוט מותאם',
    source: { id: 'custom_source', he: 'מקור מותאם', detail: 'פירוט מקור', ref: 'custom.js' }
  };
  const customRulesHtml = THRules.rulesMarkup({ rules: [customRule], description: 'מותאם' });
  assert.ok(customRulesHtml.includes('data-rule-id="custom_rule"'));

  // Custom title and className options
  const customOptsHtml = THRules.rulesMarkup(FULL, { title: 'כותרת חלופית', className: 'custom-rules-panel' });
  assert.match(customOptsHtml, /<section class="custom-rules-panel" aria-labelledby="rulesTitle">/);
  assert.match(customOptsHtml, /<h2 id="rulesTitle">כותרת חלופית<\/h2>/);

  const attack = THRules.rulesMarkup('<img src=x onerror=alert(1)> אימון גב');
  assert.doesNotMatch(attack, /<img/);
  assert.match(attack, /&lt;img/);
});

test('esc delegates to Core.esc when available and falls back safely when Core.esc is absent', function () {
  // 1) Verify delegation to Core.esc
  const origEsc = TH.esc;
  let delegateCalls = 0;
  TH.esc = function (s) {
    delegateCalls++;
    return origEsc(s);
  };
  try {
    THRules.rulesMarkup('בדיקת קריאה');
    assert.ok(delegateCalls > 0, 'Core.esc was called');
  } finally {
    TH.esc = origEsc;
  }

  // 2) Verify fallback implementation handles all HTML special characters: &, <, >, ", '
  try {
    TH.esc = null;
    const dangerousInput = 'a & b < c > d "quotes" \'single\'';
    const fallbackHtml = THRules.rulesMarkup(dangerousInput);
    assert.ok(fallbackHtml.includes('a &amp; b &lt; c &gt; d &quot;quotes&quot; &#39;single&#39;'));
    assert.doesNotMatch(fallbackHtml, /a & b < c > d "quotes" 'single'/);

    // Fallback handles null / undefined safely
    const nullRule = {
      id: 'empty_val',
      he: 'כלל ריק',
      value: null,
      detail: 'פירוט',
      source: { id: 'engine', he: 'מנוע', detail: 'טבלה', ref: null }
    };
    const nullValHtml = THRules.rulesMarkup({ rules: [nullRule] });
    assert.ok(nullValHtml.includes('<span class="rule-value"></span>'));
    assert.doesNotMatch(nullValHtml, /null/);
    assert.doesNotMatch(nullValHtml, /Stryker/);

    const nullHtml = THRules.rulesMarkup(null);
    assert.ok(nullHtml.includes('card rules'));
  } finally {
    TH.esc = origEsc;
  }
});

test('core exposes the rules API so every page can show them', function () {
  assert.equal(typeof TH.rulesWithSources, 'function');
  assert.equal(typeof TH.findRule, 'function');
  assert.equal(typeof TH.rulesMarkup, 'function');
  assert.equal(TH.rulesWithSources(FULL).rules.length, THRules.RULE_IDS.length);
  assert.equal(TH.findRule(FULL, 'duration').id, 'duration');
  assert.match(TH.rulesMarkup(FULL), /data-rule-id="duration"/);
});

test('the main page loads the rules module and renders the panel', function () {
  assert.match(indexHtml, /js\/rules-with-sources\.js/);
  assert.match(indexHtml, /TH\.rulesMarkup/);
  assert.match(indexHtml, /הנחות האימון/);
  assert.match(indexHtml, /\.rule-source/, 'the panel is styled on the page');
  // The panel must sit above the actions, so the rules can be read before the plan is started.
  assert.ok(indexHtml.indexOf('rulesMarkup') < indexHtml.indexOf('id="startBtn"'));
});

test('module attaches to globalThis.THRules in Node and works as a classic browser script in VM', function () {
  assert.equal(globalThis.THRules, THRules);

  const code = fs.readFileSync(path.join(root, 'js/rules-with-sources.js'), 'utf8');

  // 1) Classic script with window defined (browser)
  const browserWindow = {
    TH: TH,
    THEngine: THEngine,
    THInfer: THInfer,
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js')
  };
  const browserCtx = vm.createContext({
    window: browserWindow
  });
  vm.runInContext(code, browserCtx);
  assert.ok(browserWindow.THRules);
  assert.equal(typeof browserWindow.THRules.rulesWithSources, 'function');

  // 2) Script evaluated with globalThis inside strict scope when window is undefined
  const standaloneGlobal = {
    TH: TH,
    THEngine: THEngine,
    THInfer: THInfer,
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js')
  };
  const globalCtx = vm.createContext({
    globalThis: standaloneGlobal
  });
  vm.runInContext('(function() {\n  "use strict";\n' + code + '\n})();', globalCtx);
  assert.ok(standaloneGlobal.THRules);
  assert.equal(typeof standaloneGlobal.THRules.rulesWithSources, 'function');

  // 2b) Script evaluated with this fallback when both window and globalThis are undefined
  const noGlobalObj = {
    TH: TH,
    THEngine: THEngine,
    THInfer: THInfer,
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js')
  };
  const noGlobalCtx = vm.createContext({
    globalThis: undefined,
    window: undefined,
    noGlobalObj: noGlobalObj
  });
  vm.runInContext('(function() {\n' + code + '\n}).call(noGlobalObj);', noGlobalCtx);
  assert.ok(noGlobalObj.THRules);

  // 3) Module is an object but module.exports is undefined
  const fakeWindow = {
    TH: TH,
    THEngine: THEngine,
    THInfer: THInfer,
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js')
  };
  const noExportsModule = {};
  const noExportsCtx = vm.createContext({
    module: noExportsModule,
    window: fakeWindow
  });
  vm.runInContext(code, noExportsCtx);
  assert.equal(noExportsModule.exports, undefined);
  assert.ok(fakeWindow.THRules);

  // 4) Module is not an object
  const nonObjCtx = vm.createContext({
    module: 'primitive_module',
    window: fakeWindow
  });
  vm.runInContext(code, nonObjCtx);
  assert.ok(fakeWindow.THRules);
});
