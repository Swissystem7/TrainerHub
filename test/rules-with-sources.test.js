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
  for (const rule of result.rules) {
    assert.ok(listed.includes(rule.source.id), rule.id + ' source is listed in result.sources');
  }
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
  assert.match(prescription.value, new RegExp(String(rx.sets) + ' סטים'));
  assert.match(prescription.value, new RegExp(rx.reps));
  assert.match(prescription.value, new RegExp(String(rx.rest)));

  const count = byId(asked, 'exercise_count');
  assert.equal(count.source.id, 'engine');
  assert.match(count.value, new RegExp('^' + THEngine.wantedCount(45, rx) + ' תרגילים'));

  // A core-only request has no explicit goal, so the engine derives the prescription from the focus.
  const core = THRules.rulesWithSources('אימון בטן');
  assert.equal(byId(core, 'goal').source.id, 'engine');
  assert.match(byId(core, 'prescription').value, new RegExp(String(THEngine.prescription({ focus: 'core' }).rest)));
});

test('the honesty rule is always shown and names the outcome promise it blocks', function () {
  const clean = byId(THRules.rulesWithSources('אימון גב'), 'no_outcome_claims');
  assert.equal(clean.source.id, 'policy');
  assert.match(clean.value, /לא מבטיח/);

  const claim = byId(THRules.rulesWithSources('אימון שורף שומן מהר'), 'no_outcome_claims');
  assert.equal(claim.source.id, 'policy');
  assert.match(claim.value, /הבטחת תוצאה/);
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

  assert.equal(THRules.findRule(FULL, 'מנוחה').id, 'prescription');
  assert.equal(THRules.findRule(FULL, 'משך האימון').id, 'duration');
  assert.equal(THRules.findRule(FULL, 'ציוד').id, 'equipment');
  assert.equal(THRules.findRule(FULL, 'כלל שלא קיים בכלל'), null);
  assert.equal(THRules.findRule(FULL, ''), null);
  assert.equal(THRules.findRule(FULL), null);
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
});

test('rulesMarkup renders every rule with its source and escapes the description', function () {
  const result = THRules.rulesWithSources(FULL);
  const html = THRules.rulesMarkup(FULL);

  assert.match(html, /הנחות האימון/);
  for (const rule of result.rules) {
    assert.ok(html.includes('data-rule-id="' + rule.id + '"'), 'markup is missing rule ' + rule.id);
    assert.ok(html.includes(TH.esc(rule.he)), 'markup is missing the name of ' + rule.id);
    assert.ok(html.includes(TH.esc(rule.value)), 'markup is missing the value of ' + rule.id);
    assert.ok(html.includes(TH.esc(rule.source.he)), 'markup is missing the source of ' + rule.id);
  }

  const attack = THRules.rulesMarkup('<img src=x onerror=alert(1)> אימון גב');
  assert.doesNotMatch(attack, /<img/);
  assert.match(attack, /&lt;img/);
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

test('SOURCES dictionary contains exact metadata, Hebrew text, kinds, and refs', function () {
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

test('goal labels, effective goals and derived core goal', function () {
  const hyp = THRules.rulesWithSources({ goal: 'hypertrophy' });
  assert.equal(byId(hyp, 'goal').value, 'מסת שריר');
  assert.equal(byId(hyp, 'goal').source.id, 'prompt');

  const end = THRules.rulesWithSources({ goal: 'endurance' });
  assert.equal(byId(end, 'goal').value, 'סיבולת');
  assert.equal(byId(end, 'goal').source.id, 'prompt');

  const str = THRules.rulesWithSources({ goal: 'strength' });
  assert.equal(byId(str, 'goal').value, 'כוח');
  assert.equal(byId(str, 'goal').source.id, 'prompt');

  const custom = THRules.rulesWithSources({ goal: 'agility' });
  assert.equal(byId(custom, 'goal').value, 'agility');
  assert.equal(byId(custom, 'goal').source.id, 'prompt');

  const coreOnly = THRules.rulesWithSources({ focus: 'core', muscles: ['core'] });
  assert.equal(byId(coreOnly, 'goal').value, 'ליבה וייצוב — נגזר מהמיקוד שביקשת');
  assert.equal(byId(coreOnly, 'goal').source.id, 'engine');

  const def = THRules.rulesWithSources('אימון כללי');
  assert.equal(byId(def, 'goal').value, 'מסת שריר');
  assert.equal(byId(def, 'goal').source.id, 'default');
});

test('focus rule detects full body phrasing variations and excluded muscles', function () {
  for (const phrase of [
    'אימון פול בודי',
    'אימון פול-בודי',
    'אימון פולבודי',
    'אימון גוף מלא',
    'אימון full body',
    'אימון full-body',
    'אימון fullbody',
    'אימון כל הגוף'
  ]) {
    const res = THRules.rulesWithSources(phrase);
    assert.equal(byId(res, 'focus').value, 'גוף מלא', 'phrase matched: ' + phrase);
    assert.equal(byId(res, 'focus').source.id, 'prompt');
  }

  const excludedOne = THRules.rulesWithSources({ excludedMuscles: ['legs'] });
  assert.equal(byId(excludedOne, 'focus').value, 'גוף מלא בלי רגליים');
  assert.equal(byId(excludedOne, 'focus').source.id, 'prompt');

  const excludedMultiple = THRules.rulesWithSources({ excludedMuscles: ['legs', 'chest'] });
  assert.equal(byId(excludedMultiple, 'focus').value, 'גוף מלא בלי רגליים, חזה');
  assert.equal(byId(excludedMultiple, 'focus').source.id, 'prompt');

  const multiMuscles = THRules.rulesWithSources({ muscles: ['chest', 'back'] });
  assert.equal(byId(multiMuscles, 'focus').value, 'חזה, גב');
  assert.equal(byId(multiMuscles, 'focus').source.id, 'prompt');

  const unknownMuscle = THRules.rulesWithSources({ muscles: ['traps'] });
  assert.equal(byId(unknownMuscle, 'focus').value, 'traps');
  assert.equal(byId(unknownMuscle, 'focus').source.id, 'prompt');

  const fallback = THRules.rulesWithSources('ריצה קלה');
  assert.equal(byId(fallback, 'focus').value, 'גוף מלא — לא זוהתה קבוצת שריר בתיאור');
  assert.equal(byId(fallback, 'focus').source.id, 'default');
});

test('equipment rule formats multiple equipment and handles catalog fallback', function () {
  const multi = THRules.rulesWithSources({ equipment: ['dumbbells', 'bar'] });
  assert.equal(byId(multi, 'equipment').value, 'משקולות, מתח');
  assert.equal(byId(multi, 'equipment').source.id, 'prompt');

  const unknown = THRules.rulesWithSources({ equipment: ['custom_gear'] });
  assert.equal(byId(unknown, 'equipment').value, 'custom_gear');
  assert.equal(byId(unknown, 'equipment').source.id, 'prompt');

  const none = THRules.rulesWithSources({ equipment: [] });
  assert.equal(byId(none, 'equipment').value, 'לפי מה שיש במאגר');
  assert.equal(byId(none, 'equipment').source.id, 'catalog');
});

test('level rule handles known, unknown, and default levels', function () {
  const beg = THRules.rulesWithSources({ level: 'beginner' });
  assert.equal(byId(beg, 'level').value, 'מתחיל');
  assert.equal(byId(beg, 'level').source.id, 'prompt');

  const adv = THRules.rulesWithSources({ level: 'advanced' });
  assert.equal(byId(adv, 'level').value, 'מתקדם');
  assert.equal(byId(adv, 'level').source.id, 'prompt');

  const custom = THRules.rulesWithSources({ level: 'pro' });
  assert.equal(byId(custom, 'level').value, 'pro');
  assert.equal(byId(custom, 'level').source.id, 'prompt');

  const def = THRules.rulesWithSources({ level: null });
  assert.equal(byId(def, 'level').value, 'לא צוינה — בלי סינון לפי רמה');
  assert.equal(byId(def, 'level').source.id, 'default');
});

test('duration rule and minutesText handle 1 minute vs multiple minutes', function () {
  const one = THRules.rulesWithSources({ duration: 1, durationSpecified: true });
  assert.equal(byId(one, 'duration').value, 'דקה');
  assert.equal(byId(one, 'duration').source.id, 'prompt');
  assert.match(byId(one, 'exercise_count').value, /לאימון של דקה/);

  const multiple = THRules.rulesWithSources({ duration: 35, durationSpecified: true });
  assert.equal(byId(multiple, 'duration').value, '35 דקות');
  assert.equal(byId(multiple, 'duration').source.id, 'prompt');
  assert.match(byId(multiple, 'exercise_count').value, /לאימון של 35 דקות/);
});

test('toRequest normalizes various input formats and falsy values', function () {
  const fromNull = THRules.rulesWithSources(null);
  assert.equal(fromNull.description, '');
  assert.deepEqual(fromNull.request.muscles, []);
  assert.deepEqual(fromNull.request.equipment, []);
  assert.equal(fromNull.request.focus, 'full');
  assert.equal(fromNull.request.duration, 20);
  assert.equal(fromNull.request.participants, 1);

  const fromUndef = THRules.rulesWithSources(undefined);
  assert.equal(fromUndef.description, '');

  const nestedReq = THRules.rulesWithSources({
    request: { raw: 'אימון מוגדר', duration: 30, durationSpecified: true, participants: 6, participantsSpecified: true }
  });
  assert.equal(nestedReq.description, 'אימון מוגדר');
  assert.equal(nestedReq.request.duration, 30);
  assert.equal(nestedReq.request.participants, 6);

  const invalidTypes = THRules.rulesWithSources({
    raw: null,
    muscles: 'not-array',
    excludedMuscles: 'not-array',
    equipment: 'not-array',
    focus: '',
    duration: 'invalid',
    participants: -5
  });
  assert.equal(invalidTypes.description, '');
  assert.deepEqual(invalidTypes.request.muscles, []);
  assert.deepEqual(invalidTypes.request.excludedMuscles, []);
  assert.deepEqual(invalidTypes.request.equipment, []);
  assert.equal(invalidTypes.request.focus, 'full');
  assert.equal(invalidTypes.request.duration, 20);
  assert.equal(invalidTypes.request.participants, 1);

  const notObjReq = THRules.rulesWithSources({ request: 'plain-string', focus: 'chest' });
  assert.equal(notObjReq.request.focus, 'chest');
});

test('stationsText handles solo trainee, explicit group_plan, and groupPlan fallback', function () {
  const solo = THRules.rulesWithSources({ participants: 1, participantsSpecified: true });
  assert.equal(byId(solo, 'participants').value, '1 חניך — בלי חלוקה לתחנות');
  assert.equal(byId(solo, 'participants').source.id, 'prompt');

  const zero = THRules.rulesWithSources({ participants: 0, participantsSpecified: false });
  assert.equal(byId(zero, 'participants').value, '1 חניך — בלי חלוקה לתחנות');
  assert.equal(byId(zero, 'participants').source.id, 'default');

  const withGroupPlan = THRules.rulesWithSources({
    request: { participants: 8, participantsSpecified: true },
    workout: { group_plan: { he: '8 חניכים: 2 תחנות של 4 חניכים' } }
  });
  assert.equal(byId(withGroupPlan, 'participants').value, '8 חניכים: 2 תחנות של 4 חניכים');

  // Stub Engine.groupPlan to test fallback when plan or plan.he is missing
  const origGroupPlan = THEngine.groupPlan;
  try {
    THEngine.groupPlan = function () { return null; };
    const noPlan = THRules.rulesWithSources({ participants: 7, participantsSpecified: true });
    assert.equal(byId(noPlan, 'participants').value, '7 חניכים');

    THEngine.groupPlan = function () { return { he: '' }; };
    const emptyHePlan = THRules.rulesWithSources({ participants: 9, participantsSpecified: true });
    assert.equal(byId(emptyHePlan, 'participants').value, '9 חניכים');
  } finally {
    THEngine.groupPlan = origGroupPlan;
  }
});

test('exercise_count reports catalog shortage when main has fewer exercises than wanted', function () {
  const shortSession = {
    request: { duration: 20, goal: 'hypertrophy' },
    workout: {
      phases: [
        { name: 'Warm-up', exercises: [{ name: 'Warm 1' }] },
        { name: 'Main', exercises: [{ name: 'Ex 1', sets: 3 }, { name: 'Ex 2', sets: 3 }] }
      ]
    }
  };
  const resShort = THRules.rulesWithSources(shortSession);
  const want = THEngine.wantedCount(20, THEngine.prescription({ goal: 'hypertrophy' }));
  assert.equal(byId(resShort, 'exercise_count').value, want + ' תרגילים לאימון של 20 דקות — במאגר נמצאו רק 2');

  const sufficientSession = {
    request: { duration: 20, goal: 'hypertrophy' },
    workout: {
      phases: [
        { name: 'Main', exercises: new Array(want).fill({ name: 'Ex', sets: 3 }) }
      ]
    }
  };
  const resSufficient = THRules.rulesWithSources(sufficientSession);
  assert.equal(byId(resSufficient, 'exercise_count').value, want + ' תרגילים לאימון של 20 דקות');
});

test('prescription handles fitSetsEach (fewer sets on some exercises), fitSets reduction, and single sets', function () {
  // Case 1: fitSetsEach where sets - 1 === 1 ("סט אחד")
  const sessionFewerOne = {
    request: { goal: 'hypertrophy' },
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 2 }, { sets: 1 }] }
      ]
    }
  };
  const resFewerOne = THRules.rulesWithSources(sessionFewerOne);
  assert.match(byId(resFewerOne, 'prescription').value, /2 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים — ב-1 מתוך 2 התרגילים סט אחד, כדי שייכנס בזמן/);

  // Case 2: fitSetsEach where sets - 1 > 1 (e.g. 2 סטים)
  const sessionFewerMulti = {
    request: { goal: 'strength' },
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 3 }, { sets: 3 }, { sets: 2 }] }
      ]
    }
  };
  const resFewerMulti = THRules.rulesWithSources(sessionFewerMulti);
  assert.match(byId(resFewerMulti, 'prescription').value, /3 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים — ב-1 מתוך 3 התרגילים 2 סטים, כדי שייכנס בזמן/);

  // Case 3: fitSets uniform reduction (sets < rx.sets)
  const sessionUniform = {
    request: { goal: 'strength' }, // rx.sets === 4
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 2 }, { sets: 2 }] }
      ]
    }
  };
  const resUniform = THRules.rulesWithSources(sessionUniform);
  assert.match(byId(resUniform, 'prescription').value, /2 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים — קוצר מ-4 סטים כדי שייכנס בזמן/);

  // Case 4: Single set in rxText (sets: 1)
  const sessionSingleSet = {
    request: { goal: 'hypertrophy' },
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 1 }, { sets: 1 }] }
      ]
    }
  };
  const resSingle = THRules.rulesWithSources(sessionSingleSet);
  assert.match(byId(resSingle, 'prescription').value, /^סט אחד × 8-12 חזרות · 60 שנ׳ מנוחה אחרי הסט — קוצר מ-3 סטים כדי שייכנס בזמן/);

  // Case 5: Timed prescription (coreOnly has duration: 40, reps: null)
  const coreOnly = {
    request: { focus: 'core', muscles: ['core'] }
  };
  const resCore = THRules.rulesWithSources(coreOnly);
  assert.equal(byId(resCore, 'prescription').value, '3 סטים × 40 שנ׳ עבודה · 30 שנ׳ מנוחה בין סטים');

  // Case 6: mainExercises with malformed phases
  const malformed = THRules.rulesWithSources({
    request: { duration: 20 },
    workout: { phases: [null, { name: 'Warm-up' }, { name: 'Main', exercises: 'not-an-array' }] }
  });
  assert.equal(byId(malformed, 'prescription').source.id, 'engine');

  // Case 7: Normal sets matching prescription (sets === rx.sets, not reduced)
  const sessionEqual = {
    request: { goal: 'strength' }, // rx.sets === 4
    workout: {
      phases: [
        { name: 'Main', exercises: [{ sets: 4 }, { sets: 4 }] }
      ]
    }
  };
  const resEqual = THRules.rulesWithSources(sessionEqual);
  assert.equal(byId(resEqual, 'prescription').value, '4 סטים × 4-6 חזרות · 120 שנ׳ מנוחה בין סטים');
  assert.equal(byId(resEqual, 'prescription').source.id, 'engine');

  // Case 8: Custom timed duration where duration is not 40
  const origPrescription = THEngine.prescription;
  try {
    THEngine.prescription = function () {
      return { sets: 2, reps: null, duration: 25, rest: 30 };
    };
    const timed25 = THRules.rulesWithSources('אימון');
    assert.equal(byId(timed25, 'prescription').value, '2 סטים × 25 שנ׳ עבודה · 30 שנ׳ מנוחה בין סטים');

    THEngine.prescription = function () {
      return { sets: 1, reps: null, duration: null, rest: 30 };
    };
    const timedDefault = THRules.rulesWithSources('אימון');
    assert.equal(byId(timedDefault, 'prescription').value, 'סט אחד × 40 שנ׳ עבודה · 30 שנ׳ מנוחה אחרי הסט');
  } finally {
    THEngine.prescription = origPrescription;
  }
});

test('sources array has no extra items, and workout accepts only objects', function () {
  const res = THRules.rulesWithSources({ workout: true });
  assert.equal(byId(res, 'duration').source.id, 'default');

  String.prototype.phases = [{ name: 'Main', exercises: [{ sets: 1 }] }];
  try {
    const resStr = THRules.rulesWithSources({ workout: 'not-an-object' });
    assert.equal(byId(resStr, 'duration').source.id, 'default');
    assert.notEqual(byId(resStr, 'prescription').value, 'סט אחד');
  } finally {
    delete String.prototype.phases;
  }

  assert.equal(res.sources.length, new Set(res.rules.map(function (r) { return r.source.id; })).size);
  for (const s of res.sources) {
    assert.equal(typeof s, 'object');
    assert.ok(s.id);
  }
});

test('findRule edge cases: trimming, whitespace, empty queries, and value boundary search', function () {
  assert.equal(THRules.findRule(FULL, null), null);
  assert.equal(THRules.findRule(FULL, undefined), null);
  assert.equal(THRules.findRule(FULL, ''), null);
  assert.equal(THRules.findRule(FULL, '   '), null);

  // Match by id with leading/trailing spaces
  const trimmed = THRules.findRule(FULL, '  duration  ');
  assert.ok(trimmed);
  assert.equal(trimmed.id, 'duration');

  // Match spanning boundary between detail and value (verifies space separator in detail + ' ' + value)
  // Equipment detail ends with "ואומר זאת." and value is "לפי מה שיש במאגר"
  const bare = THRules.rulesWithSources('אימון');
  const matched = THRules.findRule(bare, 'זאת. לפי');
  assert.ok(matched, 'query spanning detail and value with space matches');
  assert.equal(matched.id, 'equipment');
});

test('ruleMarkup and rulesMarkup exact rendering, custom opts, and pre-built rules input', function () {
  const result = THRules.rulesWithSources(FULL);
  const customHtml = THRules.rulesMarkup(result, {
    title: 'הנחות אימון מיוחדות',
    className: 'special-panel'
  });

  assert.ok(customHtml.startsWith('<section class="special-panel" aria-labelledby="rulesTitle">'));
  assert.ok(customHtml.includes('<h2 id="rulesTitle">הנחות אימון מיוחדות</h2>'));
  assert.ok(customHtml.includes('<p class="honest">כל כלל שהמנוע הפעיל על הבקשה הזו, ומאיפה הוא בא. עברו על הרשימה לפני שמתחילים.</p>'));
  assert.ok(customHtml.includes('<ul class="rules-list">'));
  assert.ok(customHtml.endsWith('</ul></section>'));

  // Exact markup checks
  const focusLi = '<li class="rule" data-rule-id="focus"><b>מיקוד שרירים</b><span class="rule-value">ליבה</span><span class="pill rule-source">מקור: מה שביקשת</span><small class="rule-detail">מסנן את המאגר לתרגילים שעובדים על מה שביקשת. נקרא מתוך התיאור והשדות שמילאת.</small></li>';
  assert.ok(customHtml.includes(focusLi));

  const durationLi = '<li class="rule" data-rule-id="duration"><b>משך האימון</b><span class="rule-value">45 דקות</span><span class="pill rule-source">מקור: מה שביקשת</span><small class="rule-detail">קובע כמה תרגילים נכנסים לתוכנית. נקרא מתוך התיאור והשדות שמילאת.</small></li>';
  assert.ok(customHtml.includes(durationLi));

  const engineLi = '<li class="rule" data-rule-id="exercise_count"><b>מספר התרגילים</b><span class="rule-value">4 תרגילים לאימון של 45 דקות</span><span class="pill rule-source">מקור: טבלה קבועה במנוע</span><small class="rule-detail">נגזר ממשך האימון לפי מדרגות קבועות, לא לפי כמה סרטונים יש; מרשם כבד (כוח: 4 סטים ו-120 שנ׳ מנוחה) מצמצם אותו כדי שהאימון ייכנס בזמן. מספרים שכתובים בקוד ורצים אותו דבר בכל אימון. · js/session-builder.js</small></li>';
  assert.ok(customHtml.includes(engineLi));

  // Default options
  const defaultHtml = THRules.rulesMarkup(FULL);
  assert.ok(defaultHtml.startsWith('<section class="card rules" aria-labelledby="rulesTitle"><h2 id="rulesTitle">הנחות האימון ומקורותיהן</h2>'));

  // When description is empty, rules-for paragraph is not rendered and no Stryker string
  const noDescHtml = THRules.rulesMarkup({ rules: result.rules, description: '' });
  assert.ok(!noDescHtml.includes('class="rules-for"'));
  assert.ok(!noDescHtml.includes('Stryker was here!'));

  // Pre-built custom rules object directly accepted without re-evaluating
  const mockResult = {
    description: 'בקשה ייחודית',
    rules: [
      {
        id: 'mock_rule',
        he: 'כלל מומצא',
        detail: 'פירוט מומצא',
        value: 'ערך מומצא',
        source: { id: 'default', he: 'ברירת מחדל של TrainerHub', detail: 'לא ביקשת — השלמנו, ואפשר לשנות בשדות שמעל.', ref: 'js/rules-with-sources.js' }
      }
    ]
  };
  const mockHtml = THRules.rulesMarkup(mockResult);
  assert.ok(mockHtml.includes('data-rule-id="mock_rule"'));
  assert.ok(mockHtml.includes('כלל מומצא'));
  assert.ok(mockHtml.includes('<p class="rules-for">נבנה לפי הבקשה: «בקשה ייחודית»</p>'));

  // Malformed input.rules falls back to rulesWithSources
  const malformedRulesHtml = THRules.rulesMarkup({ rules: 'not-an-array' });
  assert.ok(malformedRulesHtml.includes('data-rule-id="duration"'));

  // null and undefined input to rulesMarkup
  const nullHtml = THRules.rulesMarkup(null);
  assert.ok(nullHtml.includes('data-rule-id="duration"'));

  const undefHtml = THRules.rulesMarkup(undefined);
  assert.ok(undefHtml.includes('data-rule-id="duration"'));
});

test('esc calls Core.esc when present and uses fallback when TH.esc is unavailable', function () {
  const origEsc = TH.esc;
  let coreEscCalls = 0;
  TH.esc = function (s) {
    coreEscCalls++;
    return origEsc(s);
  };
  try {
    THRules.rulesMarkup('אימון');
    assert.ok(coreEscCalls > 0, 'Core.esc should be called when present');

    TH.esc = null;
    const markup = THRules.rulesMarkup('אימון & <tag> "quote" \'apostrophe\'');
    assert.ok(markup.includes('&amp;'));
    assert.ok(markup.includes('&lt;tag&gt;'));
    assert.ok(markup.includes('&quot;quote&quot;'));
    assert.ok(markup.includes('&#39;apostrophe&#39;'));

    // Test null/empty handling with fallback esc
    const nullMarkup = THRules.rulesMarkup({
      rules: [
        {
          id: 'test_empty',
          he: 'בדיקה',
          detail: 'פירוט',
          value: null,
          source: { id: 'default', he: 'ברירת מחדל', detail: 'פירוט', ref: null }
        }
      ]
    });
    assert.ok(nullMarkup.includes('<span class="rule-value"></span>'));
    assert.ok(!nullMarkup.includes('null'));
    assert.ok(!nullMarkup.includes('Stryker was here!'));
  } finally {
    TH.esc = origEsc;
  }
});

test('global window export attachment', function () {
  const resolved = require.resolve('../js/rules-with-sources.js');
  delete require.cache[resolved];
  global.window = {};
  try {
    const rulesInWindow = require('../js/rules-with-sources.js');
    assert.ok(global.window.THRules);
    assert.equal(typeof global.window.THRules.rulesWithSources, 'function');
  } finally {
    delete global.window;
    delete require.cache[resolved];
    require('../js/rules-with-sources.js');
  }
});

test('classic script browser loading and environment exports', function () {
  const code = fs.readFileSync(path.join(root, 'js/rules-with-sources.js'), 'utf8');

  // 1. Browser window context without module/exports
  const windowContext = {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: require('../js/core.js')
  };
  windowContext.window = windowContext;
  vm.runInNewContext(code, windowContext);
  assert.ok(windowContext.window.THRules);
  assert.equal(typeof windowContext.window.THRules.rulesWithSources, 'function');

  // 2. globalThis context (window undefined)
  const globalContext = {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: require('../js/core.js')
  };
  globalContext.globalThis = globalContext;
  vm.runInNewContext(code, globalContext);
  assert.ok(globalContext.globalThis.THRules);
  assert.equal(typeof globalContext.globalThis.THRules.rulesWithSources, 'function');

  // 3. Fallback to `this` when window and globalThis are undefined
  const thisContext = {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: require('../js/core.js')
  };
  vm.runInNewContext(code, thisContext);
  assert.ok(thisContext.THRules);
  assert.equal(typeof thisContext.THRules.rulesWithSources, 'function');

  // 4. Standalone esc implementation when Core is null or Core.esc is not a function
  const noCoreContext = {
    THInfer: require('../js/infer.js'),
    THPrompt: require('../js/prompt-parser.js'),
    THAnalyzer: require('../js/analyzer.js'),
    THEngine: require('../js/session-builder.js'),
    TH: null
  };
  noCoreContext.window = noCoreContext;
  vm.runInNewContext(code, noCoreContext);
  const markup = noCoreContext.window.THRules.rulesMarkup('אימון & <tag> "quote" \'apostrophe\'');
  assert.ok(markup.includes('&amp;'));
  assert.ok(markup.includes('&lt;tag&gt;'));
  assert.ok(markup.includes('&quot;quote&quot;'));
  assert.ok(markup.includes('&#39;apostrophe&#39;'));

  // Also test null/empty input with fallback esc
  const nullMarkup = noCoreContext.window.THRules.rulesMarkup(null);
  assert.ok(nullMarkup.includes('class="card rules"'));
});
