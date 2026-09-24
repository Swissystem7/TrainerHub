'use strict';

/* ── The owner's red lines, enforced over every Hebrew string a rule result can
   carry ───────────────────────────────────────────────────────────────────────
   The standing instruction: nothing a trainer reads may say a session is safe or
   unsafe, imply that a professional or a doctor approved it, or name a
   professional body.

   Before this file the rule lived as four hand-copied regexes inside four other
   tests, each of them sampling ONE call of ONE rule. What that left uncovered:
   SOURCE_NOTE_HE and RULE_NOTE_HE — the two notes that ride on EVERY result — the
   whole of checkBeginnerEquipment and checkCatalogTaxonomy, and 12 of the 18
   finding codes.

   The guard itself is data in js/analyzer.js (RED_LINE_TERMS). This file runs it
   over a corpus built to produce every finding code and every taxonomy problem
   field the four rules can emit, harvests every string on those results that
   contains a Hebrew letter, and checks two things:

     1. every harvested string is clean, and
     2. the harvested set of keys is EXACTLY the enumerated set below.

   (2) is the part that matters for the future: a string added beside these — a
   new finding code, a second note on a result — turns up as a key nobody
   enumerated and fails this file. It cannot be exempt by being new.

   The Hebrew-letter filter is the boundary on purpose: `source` is the
   developer-facing English citation, it names ACSM, it is meant to, and no page
   renders it (test/phases.test.js keeps it off all ten pages). That is asserted
   below rather than assumed.

   No clock, no randomness, no network, no new dependency. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TH = require('../js/core.js');
const Analyzer = require('../js/analyzer.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

/* ── the corpus ──────────────────────────────────────────────────────────────
   Built to reach every branch that writes Hebrew, not to be realistic. Bad
   values fed to the taxonomy checker are Latin, so what is harvested below is
   the module's own wording rather than input echoed back. */

function handPlan(minutes, warmMinutes, coolMinutes, opts) {
  opts = opts || {};
  const phases = [];
  if (!opts.dropWarmup) {
    phases.push({ name: 'Warm-up', duration_minutes: warmMinutes, exercises: [] });
  }
  phases.push({ name: 'Main', duration_minutes: minutes - warmMinutes - coolMinutes, exercises: [] });
  if (!opts.dropCooldown) {
    phases.push({ name: 'Cool-down', duration_minutes: coolMinutes, exercises: [] });
  }
  return { title: 'ידני', duration_minutes: minutes, phases: phases };
}

function beginnerSession(exercises) {
  return {
    title: 'בדיקה',
    duration_minutes: 30,
    level: 'beginner',
    phases: [{ name: 'Main', duration_minutes: 30, exercises: exercises }]
  };
}

const ARC = {
  warm: { name: 'Warm-up', exercises: [{ name: 'חימום' }] },
  cool: { name: 'Cool-down', exercises: [{ name: 'מתיחות' }] },
  plyo: { name: 'Main', exercises: [{ name: 'מטפס הרים' }] },
  calm: { name: 'Main', exercises: [{ name: 'פלאנק' }] },
  hard: { name: 'Main', exercises: [{ name: 'מטפס הרים', level: 'intermediate' }] },
  barWarm: { name: 'Warm-up', exercises: [{ name: 'מתח אוסטרלי' }] },
  barCool: { name: 'Cool-down', exercises: [{ name: 'מתח אוסטרלי' }] }
};

function goodEntry(id) {
  return { id: id, he: 'תרגיל', muscles: ['core'], equipment: ['none'], level: 'beginner' };
}

function corpus() {
  return [
    /* TH-PHASE-DURATION — all 7 codes */
    Analyzer.checkPhaseDurations(handPlan(60, 3, 3)),
    Analyzer.checkPhaseDurations(handPlan(90, 14, 14)),
    Analyzer.checkPhaseDurations(handPlan(60, 0, 0, { dropWarmup: true, dropCooldown: true })),

    /* TH-BEGINNER-EQUIPMENT — both codes */
    Analyzer.checkBeginnerEquipment(beginnerSession([{ name: 'מתח אוסטרלי' }])),
    Analyzer.checkBeginnerEquipment(beginnerSession([{ name: 'Barbell back squat' }])),

    /* TH-INTENSITY-ARC — all 9 codes */
    Analyzer.validateIntensityArc([]),
    Analyzer.validateIntensityArc([ARC.plyo, ARC.warm, ARC.cool]),
    Analyzer.validateIntensityArc([ARC.warm, ARC.plyo]),
    Analyzer.validateIntensityArc([ARC.warm, ARC.cool, ARC.plyo]),
    Analyzer.validateIntensityArc([ARC.barWarm, ARC.calm, ARC.cool]),
    Analyzer.validateIntensityArc([ARC.warm, ARC.plyo, ARC.barCool]),
    Analyzer.validateIntensityArc([ARC.warm, ARC.plyo, ARC.calm, ARC.hard, ARC.cool]),
    Analyzer.validateIntensityArc([ARC.warm, ARC.hard, ARC.calm, ARC.plyo, ARC.cool]),

    /* TH-CATALOG-TAXONOMY — all 6 problem fields */
    Analyzer.checkCatalogTaxonomy('not an object'),
    Analyzer.checkCatalogTaxonomy({ a: null }),
    Analyzer.checkCatalogTaxonomy({ a: { id: 'b', muscles: ['core'], equipment: ['none'], level: 'beginner' } }),
    Analyzer.checkCatalogTaxonomy({ a: { id: 'a', equipment: ['none'], level: 'beginner' } }),
    Analyzer.checkCatalogTaxonomy({ a: { id: 'a', muscles: ['core'], equipment: ['jetpack'], level: 'beginner' } }),
    Analyzer.checkCatalogTaxonomy({ a: { id: 'a', muscles: ['core'], equipment: ['none'], level: 'elite' } }),

    /* and the clean paths, whose notes ride along all the same */
    Analyzer.checkPhaseDurations(handPlan(60, 5, 5)),
    Analyzer.checkBeginnerEquipment(beginnerSession([{ name: 'פלאנק' }])),
    Analyzer.validateIntensityArc([ARC.warm, ARC.plyo, ARC.cool]),
    Analyzer.checkCatalogTaxonomy({ a: goodEntry('a') })
  ];
}

const HEBREW_RX = /[֐-׿]/;

function hebrew(value) {
  return typeof value === 'string' && HEBREW_RX.test(value);
}

/* Harvests every Hebrew-bearing string on a rule result, keyed so the key names
   the string rather than where it happened to sit in an array. */
function harvest(result, into) {
  const rule = result.rule;
  Object.keys(result).forEach(function (field) {
    if (hebrew(result[field])) into[rule + '.' + field] = result[field];
  });
  (result.findings || []).forEach(function (finding) {
    Object.keys(finding).forEach(function (field) {
      if (hebrew(finding[field])) into[rule + '.findings[' + finding.code + '].' + field] = finding[field];
    });
  });
  (result.problems || []).forEach(function (problem) {
    Object.keys(problem).forEach(function (field) {
      if (hebrew(problem[field])) into[rule + '.problems[' + problem.field + '].' + field] = problem[field];
    });
  });
  return into;
}

function harvestAll() {
  const found = {};
  corpus().forEach(function (result) { harvest(result, found); });
  return found;
}

/* ── the enumeration ─────────────────────────────────────────────────────────
   Every Hebrew string the four rules can put on a result, named. Add a string to
   a result without adding it here and the coverage test fails. */
const COVERED = [
  'TH-BEGINNER-EQUIPMENT.findings[equipment-off-list].he',
  'TH-BEGINNER-EQUIPMENT.findings[equipment-unknown].he',
  'TH-BEGINNER-EQUIPMENT.note',
  'TH-CATALOG-TAXONOMY.problems[catalog].he',
  'TH-CATALOG-TAXONOMY.problems[entry].he',
  'TH-CATALOG-TAXONOMY.problems[equipment].he',
  'TH-CATALOG-TAXONOMY.problems[id].he',
  'TH-CATALOG-TAXONOMY.problems[level].he',
  'TH-CATALOG-TAXONOMY.problems[muscles].he',
  'TH-INTENSITY-ARC.findings[conditioning-missing].he',
  'TH-INTENSITY-ARC.findings[cooldown-missing].he',
  'TH-INTENSITY-ARC.findings[cooldown-not-last].he',
  'TH-INTENSITY-ARC.findings[no-fall].he',
  'TH-INTENSITY-ARC.findings[no-rise].he',
  'TH-INTENSITY-ARC.findings[not-monotonic-fall].he',
  'TH-INTENSITY-ARC.findings[not-monotonic-rise].he',
  'TH-INTENSITY-ARC.findings[phases-missing].he',
  'TH-INTENSITY-ARC.findings[warmup-not-first].he',
  'TH-INTENSITY-ARC.note',
  'TH-PHASE-DURATION.findings[combined-outside-reference].he',
  'TH-PHASE-DURATION.findings[cooldown-above-reference].he',
  'TH-PHASE-DURATION.findings[cooldown-below-minimum].he',
  'TH-PHASE-DURATION.findings[cooldown-missing].he',
  'TH-PHASE-DURATION.findings[warmup-above-reference].he',
  'TH-PHASE-DURATION.findings[warmup-below-minimum].he',
  'TH-PHASE-DURATION.findings[warmup-missing].he',
  'TH-PHASE-DURATION.note',
  'TH-PHASE-DURATION.sourceNote'
];

test('the corpus reaches every Hebrew string the four rules can ship on a result', function () {
  assert.deepEqual(Object.keys(harvestAll()).sort(), COVERED.slice().sort(),
    'a string on a result that nobody enumerated, or an enumerated one the corpus ' +
    'no longer reaches: add it to COVERED, or extend corpus() to reach it');
});

test('no Hebrew string on a rule result crosses a red line', function () {
  const found = harvestAll();
  const keys = Object.keys(found).sort();
  assert.equal(keys.length, COVERED.length);
  for (const key of keys) {
    assert.deepEqual(Analyzer.redLineHits(found[key]), [],
      key + ' — «' + found[key] + '»');
  }
});

test('the two notes that ride on every result are covered by name', function () {
  const found = harvestAll();
  assert.equal(found['TH-PHASE-DURATION.sourceNote'], Analyzer.SOURCE_NOTE_HE);
  assert.equal(found['TH-PHASE-DURATION.note'], Analyzer.RULE_NOTE_HE);
  assert.equal(found['TH-BEGINNER-EQUIPMENT.note'], Analyzer.RULE_NOTE_HE);
  assert.equal(found['TH-INTENSITY-ARC.note'], Analyzer.RULE_NOTE_HE);
  assert.deepEqual(Analyzer.redLineHits(Analyzer.SOURCE_NOTE_HE), []);
  assert.deepEqual(Analyzer.redLineHits(Analyzer.RULE_NOTE_HE), []);
});

/* A guard that never fires would pass everything above. These are its positive
   controls: each term, and the shipped notes with one word added. */
test('the guard fires on each term it claims to cover', function () {
  assert.deepEqual(Analyzer.RED_LINE_TERMS.map(function (t) { return t.term; }),
    ['בטוח', 'מסוכן', 'מאושר', 'אישור', 'רפואי', 'ACSM', 'American College',
      'Guidelines for Exercise']);

  assert.deepEqual(Analyzer.redLineHits('האימון הזה בטוח'), ['בטוח']);
  assert.deepEqual(Analyzer.redLineHits('התרגיל מסוכן למתחילים'), ['מסוכן']);
  assert.deepEqual(Analyzer.redLineHits('התוכנית מאושרת'), ['מאושר']);
  assert.deepEqual(Analyzer.redLineHits('ניתן אישור מקצועי'), ['אישור']);
  assert.deepEqual(Analyzer.redLineHits('ייעוץ רפואי מותאם'), ['רפואי']);
  assert.deepEqual(Analyzer.redLineHits('לפי ACSM'), ['ACSM']);
  assert.deepEqual(Analyzer.redLineHits('the American College of Sports Medicine'), ['American College']);
  assert.deepEqual(Analyzer.redLineHits("Guidelines for Exercise Testing"), ['Guidelines for Exercise']);
  assert.deepEqual(Analyzer.redLineHits(''), []);
  assert.deepEqual(Analyzer.redLineHits(null), []);

  /* the two notes are clean because of what they say, not because the guard
     cannot see them */
  assert.deepEqual(Analyzer.redLineHits(Analyzer.SOURCE_NOTE_HE + ' האימון בטוח.'), ['בטוח']);
  assert.deepEqual(Analyzer.redLineHits(Analyzer.RULE_NOTE_HE + ' מאושר על ידי ACSM.'),
    ['מאושר', 'ACSM']);
});

test('the denial clauses are exempt as whole phrases, and nothing wider is', function () {
  assert.deepEqual(Analyzer.RED_LINE_EXEMPT_PHRASES,
    ['אין כאן אישור מקצועי', 'אין ייעוץ רפואי']);
  for (const phrase of Analyzer.RED_LINE_EXEMPT_PHRASES) {
    assert.ok(Analyzer.RULE_NOTE_HE.indexOf(phrase) !== -1,
      'the exemption exists for RULE_NOTE_HE and must stay a clause of it: ' + phrase);
    assert.deepEqual(Analyzer.redLineHits(phrase), []);
  }
  assert.deepEqual(Analyzer.redLineHits('אישור מקצועי'), ['אישור']);
  assert.deepEqual(Analyzer.redLineHits('ייעוץ רפואי'), ['רפואי']);
  assert.deepEqual(Analyzer.redLineHits('יש כאן אישור מקצועי'), ['אישור']);
});

/* The one place a red-line term is allowed to live: the developer-facing English
   citation. It carries no Hebrew, which is why the harvest above never sees it,
   and test/phases.test.js is what keeps it off every page. */
test('the English source field is the deliberate exception, and it holds no Hebrew', function () {
  const source = Analyzer.PHASE_DURATION_RULE.source;
  assert.deepEqual(Analyzer.redLineHits(source), ['ACSM', 'Guidelines for Exercise']);
  assert.equal(HEBREW_RX.test(source), false, 'no trainer-readable text in the citation field');
  for (const other of [Analyzer.BEGINNER_EQUIPMENT_RULE.source, Analyzer.INTENSITY_ARC_RULE.source,
    Analyzer.TAXONOMY_RULE.source]) {
    assert.deepEqual(Analyzer.redLineHits(other), [], 'these rules cite nobody');
    assert.equal(HEBREW_RX.test(other), false);
  }
});
