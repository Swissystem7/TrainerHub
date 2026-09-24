'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');
const Infer = require('../js/infer.js');

test('analyzeExercise infers plank as core / time / beginner', function () {
  const a = Analyzer.analyzeExercise({ he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner' });
  assert.equal(a.primary, 'core');
  assert.equal(a.pattern, 'core');
  assert.equal(a.load, 'time');
  assert.equal(a.difficulty, 'beginner');
  assert.ok(a.secondary.indexOf('shoulders') !== -1);
});

test('analyzeExercise maps australian pull-up to pull + back/biceps', function () {
  const a = Analyzer.analyzeExercise({ he: 'מתח אוסטרלי' });
  assert.equal(a.pattern, 'pull');
  assert.ok(a.muscles.indexOf('back') !== -1);
  assert.ok(a.primary === 'back' || a.secondary.indexOf('biceps') !== -1 || a.muscles.indexOf('biceps') !== -1);
  assert.equal(Infer.inferFromName('מתח אוסטרלי').muscles.indexOf('biceps') !== -1, true);
});

test('analyzeExercise maps push-ups to push and mountain climbers to plyo', function () {
  assert.equal(Analyzer.analyzeExercise({ he: 'אתגר שכיבות שמיכה' }).pattern, 'push');
  assert.equal(Analyzer.analyzeExercise({ he: 'מטפס הרים' }).pattern, 'plyo');
  assert.equal(Analyzer.analyzeExercise({ he: 'מדרגות' }).pattern, 'squat');
  assert.equal(Analyzer.analyzeExercise({ he: 'גב תחתון' }).pattern, 'hinge');
});

test('analyzeSession reports volume, push/pull, stimulus, and quality flags', function () {
  const workout = {
    title: 'אימון ליבה',
    duration_minutes: 20,
    goal: null,
    phases: [
      { name: 'Main', exercises: [
        { name: 'פלאנק', id: 'plank', sets: 3, reps: null, duration_seconds: 40, rest_seconds: 30 },
        { name: 'מטפס הרים', id: 'mountain_climber', sets: 3, reps: 15, duration_seconds: null, rest_seconds: 30 },
        { name: 'בטן', id: 'crunches', sets: 3, reps: 15, duration_seconds: null, rest_seconds: 30 },
        { name: 'פלאנק צידי', id: 'side', sets: 3, reps: null, duration_seconds: 30, rest_seconds: 30 }
      ] }
    ]
  };
  const s = Analyzer.analyzeSession(workout);
  assert.ok(s.volume.core >= 70);
  assert.equal(s.pushPull.pull, 0);
  assert.ok(s.durationMinutes >= 15);
  assert.ok(s.stimulus && s.stimulus.key);
  assert.match(s.stimulus.detail, /גירוי/);
  assert.doesNotMatch(s.stimulus.detail, /תרזה|מובטח|5 ק/);
  const flags = s.flags.map(function (f) { return f.key; });
  assert.ok(flags.indexOf('no-pull') !== -1);
  assert.ok(flags.indexOf('no-warmup') !== -1);
  assert.ok(s.flags.some(function (f) { return /ליבה/.test(f.he) && /גב/.test(f.he); }));
});

test('analyzeSession never phrases stimulus as a promised outcome', function () {
  const workout = {
    duration_minutes: 30,
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'חימום', sets: 1, duration_seconds: 180 }] },
      { name: 'Main', exercises: [
        { name: 'מתח אוסטרלי', sets: 4, reps: '4-6', rest_seconds: 120 },
        { name: 'שכיבות שמיכה', sets: 4, reps: '4-6', rest_seconds: 120 }
      ] },
      { name: 'Cool-down', exercises: [{ name: 'מתיחות', sets: 1, duration_seconds: 180 }] }
    ]
  };
  const s = Analyzer.analyzeSession(Object.assign({ goal: 'strength' }, workout));
  assert.equal(s.stimulus.key, 'strength');
  assert.match(s.stimulus.detail, /גירוי לכוח/);
  assert.equal(Analyzer.claimsOutcome(s.stimulus.detail), false);
  assert.equal(Analyzer.claimsOutcome('תרזה 5 ק"ג'), true);
});

test('inferFromName follows the spec examples for plank, bands, and australian pull-up', function () {
  const plank = Infer.inferFromName('פלאנק', { folder: 'בטן' });
  assert.deepEqual(plank.muscles, ['core']);
  assert.deepEqual(plank.equipment, ['none']);
  assert.equal(plank.level, 'beginner');
  const bands = Infer.inferFromName('גומיות רגליים', { folder: 'גומיות' });
  assert.ok(bands.equipment.indexOf('band') !== -1);
  const row = Infer.inferFromName('מתח אוסטרלי', { folder: 'גב' });
  assert.ok(row.muscles.indexOf('back') !== -1);
  assert.ok(row.muscles.indexOf('biceps') !== -1);
});

/* ── Round-2 item 2: equipment kept out of a beginner / kids session ──────────
   The blocked list and the reasons for it are in js/analyzer.js. The counts
   below were derived by hand from js/catalog.json before the code was written:
   exactly one of the 78 entries (bodyweight_row / מתח אוסטרלי, equipment ["bar"])
   carries a blocked tag; barbell and machine are in the enumeration but unused. */

const fs = require('node:fs');
const path = require('node:path');

function session(level, audience, exercises) {
  return {
    title: 'בדיקה',
    duration_minutes: 30,
    level: level,
    tags: audience ? ['core', audience] : ['core'],
    phases: [{ name: 'Main', exercises: exercises }]
  };
}

const BAR_EXERCISE = { name: 'מתח אוסטרלי', id: 'bodyweight_row', sets: 3, reps: '8-12' };
const SAFE_EXERCISES = [
  { name: 'פלאנק', id: 'plank', sets: 3, duration_seconds: 40 },
  { name: 'סולם רגליים', id: 'ladder_feet', equipment: ['ladder'], sets: 3, reps: 10 },
  { name: 'מדרגות', id: 'step_up', equipment: ['stairs'], sets: 3, reps: 10 }
];

test('a beginner or kids session lists the exercises whose equipment is off the list', function () {
  for (const workout of [session('beginner', '', [BAR_EXERCISE]), session('', 'kids', [BAR_EXERCISE])]) {
    const check = Analyzer.checkBeginnerEquipment(workout);
    assert.equal(check.applies, true);
    assert.equal(check.findings.length, 1);
    const finding = check.findings[0];
    assert.equal(finding.code, 'equipment-off-list');
    assert.equal(finding.rule, 'TH-BEGINNER-EQUIPMENT');
    assert.deepEqual(finding.equipment, ['bar']);
    assert.match(finding.he, /מתח אוסטרלי/);
    assert.match(finding.he, /ברשימה השמרנית/);
  }
  assert.deepEqual(Analyzer.BEGINNER_EQUIPMENT_RULE.blocked, ['bar', 'barbell', 'machine']);
});

test('agility ladder and stairs stay off the blocked list, and safe combos are not flagged', function () {
  const check = Analyzer.checkBeginnerEquipment(session('beginner', 'kids', SAFE_EXERCISES));
  assert.equal(check.applies, true);
  assert.deepEqual(check.findings, [], 'ordinary kids footwork drills must not be flagged');
  assert.equal(Analyzer.BEGINNER_EQUIPMENT_RULE.blocked.indexOf('ladder'), -1);
  assert.equal(Analyzer.BEGINNER_EQUIPMENT_RULE.blocked.indexOf('stairs'), -1);
});

test('the equipment rule does not run at all for an intermediate adult session', function () {
  const check = Analyzer.checkBeginnerEquipment(session('intermediate', '', [BAR_EXERCISE]));
  assert.equal(check.applies, false);
  assert.deepEqual(check.findings, []);
  assert.equal(check.level, 'intermediate');
  assert.equal(check.audience, '');
  const forced = Analyzer.checkBeginnerEquipment(session('intermediate', '', [BAR_EXERCISE]), { level: 'beginner' });
  assert.equal(forced.applies, true);
  assert.equal(forced.findings.length, 1);
});

test('exactly one catalog entry carries blocked equipment, and the rule claims no guideline', function () {
  const catalog = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
  const rows = Object.values(catalog);
  assert.equal(rows.length, 78);
  const workout = session('beginner', '', rows.map(function (entry) {
    return { name: entry.he, id: entry.id, equipment: entry.equipment, sets: 1, reps: 10 };
  }));
  const check = Analyzer.checkBeginnerEquipment(workout);
  assert.deepEqual(check.findings.map(function (f) { return f.id; }), ['bodyweight_row']);

  for (const finding of check.findings) {
    assert.doesNotMatch(finding.he, /בטוח|לא בטוח|מסוכן|אסור|מאושר|אישור|רפואי/, finding.id);
    assert.equal(Analyzer.claimsOutcome(finding.he), false);
  }
  assert.match(check.source, /No published guideline was read for it/);
  assert.match(check.note, /אין ייעוץ רפואי/);
});
