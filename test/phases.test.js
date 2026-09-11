'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
TH.setCatalog({});

const root = path.join(__dirname, '..');
const weekly = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const studio = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');
const workoutMode = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

const PHASE_NAMES = ['Warm-up', 'Main', 'Cool-down'];

function profile() {
  return {
    age: 31,
    gender: 'other',
    fitnessLevel: 'intermediate',
    goals: ['hypertrophy'],
    availableEquipment: ['dumbbells'],
    targetMuscles: [],
    injuries: [],
    previousWorkouts: 8
  };
}

function assertPhaseSchema(phases, label) {
  assert.ok(Array.isArray(phases) && phases.length === 3, label + ' needs 3 phases');
  phases.forEach(function (phase, i) {
    assert.equal(phase.name, PHASE_NAMES[i], label + ' phase ' + i);
    assert.ok(Array.isArray(phase.exercises), label + ' ' + phase.name + ' exercises');
    for (const ex of phase.exercises) {
      assert.equal(typeof ex.name, 'string');
      assert.ok('id' in ex);
      assert.ok('sets' in ex);
      assert.ok('reps' in ex);
      assert.ok('duration_seconds' in ex);
      assert.ok('rest_seconds' in ex);
    }
  });
}

test('generateWorkoutProgram emits the shared Warm-up / Main / Cool-down schema', function () {
  const program = TH.generateWorkoutProgram(profile(), 1, 3);
  assert.ok(program.dailyWorkouts.length >= 1);
  for (const day of program.dailyWorkouts) {
    assertPhaseSchema(day.phases, 'day ' + day.day);
    const main = day.phases[1].exercises;
    assert.ok(main.length >= 1);
    assert.equal(main[0].sets, 3);
    assert.equal(main[0].rest_seconds, 60);
  }
});

test('toPhasesWorkout is a lossless view of a daily workout for workout-mode', function () {
  const program = TH.generateWorkoutProgram(profile(), 1, 1);
  const day = program.dailyWorkouts[0];
  const workout = TH.toPhasesWorkout(day, { equipment: ['משקולות'], intensity: 'medium' });
  assert.equal(workout.title, day.title);
  assertPhaseSchema(workout.phases, 'toPhasesWorkout');
  assert.equal(workout.phases[1].exercises.length, day.exercises.length);
  assert.equal(workout.phases[1].exercises[0].id, day.exercises[0].name);
  assert.equal(TH.phaseLabel('Warm-up'), 'חימום');
  assert.equal(TH.phaseLabel('Main'), 'עיקר');
  assert.equal(TH.phaseLabel('Cool-down'), 'שחרור');
});

test('compactPlan / expandPlan keep the phase contract the journal later imports', function () {
  const program = TH.generateWorkoutProgram(profile(), 1, 1);
  const workout = TH.toPhasesWorkout(program.dailyWorkouts[0], {});
  workout.participants = 16;
  workout.equipment = ['גומיות', 'קונוסים'];
  workout.group_plan = { stations: 4, per_station: 4, he: '16 חניכים: 4 תחנות' };
  const compact = TH.compactPlan(workout);
  assert.equal(compact.p.length, 3);
  assert.equal(compact.p[0].n, 'Warm-up');
  assert.equal(compact.p[1].n, 'Main');
  assert.ok(compact.p[1].e[0].s);
  assert.ok(compact.p[1].e[0].r);
  const expanded = TH.expandPlan(compact);
  assert.equal(expanded.participants, 16);
  assert.deepEqual(expanded.equipment, ['גומיות', 'קונוסים']);
  assert.equal(expanded.group_plan.stations, 4);
  assertPhaseSchema(expanded.phases, 'expandPlan');
  assert.equal(expanded.phases[1].exercises[0].id, workout.phases[1].exercises[0].id);
  assert.equal(expanded.phases[1].exercises[0].sets, workout.phases[1].exercises[0].sets);
  assert.equal(expanded.phases[1].exercises[0].rest_seconds, workout.phases[1].exercises[0].rest_seconds);
});

test('weekly builder, studio, and workout-mode all consume the same phases fields', function () {
  assert.match(weekly, /TH\.toPhasesWorkout/);
  assert.match(weekly, /TH\.phaseLabel/);
  assert.match(weekly, /w\.phases/);
  assert.match(weekly, /frontend\/workout-mode\.html/);

  assert.match(studio, /w\.phases/);
  assert.match(studio, /'Warm-up'/);
  assert.match(studio, /'Cool-down'/);
  assert.match(studio, /workout-mode\.html/);
  assert.match(studio, /TH\.store\.set\(TH\.KEYS\.active/);

  assert.match(workoutMode, /TH\.PHASE_LABELS/);
  assert.match(workoutMode, /workout\.phases/);
  assert.match(workoutMode, /ex\.duration_seconds/);
  assert.match(workoutMode, /ex\.rest_seconds/);
  assert.match(workoutMode, /ThLink\.decodeHash/);
  assert.match(workoutMode, /ThLink\.encodeResult/);
  assert.equal(TH.PHASE_LABELS['Warm-up'], 'חימום');
  assert.equal(TH.PHASE_LABELS['Main'], 'עיקר');
  assert.equal(TH.PHASE_LABELS['Cool-down'], 'שחרור');
});

/* ── Round-2 item 1: warm-up / cool-down minutes ──────────────────────────────
   The rule and the reading of its source live in js/analyzer.js. These tests pin
   the arithmetic that was derived by hand before the code was written:
     session >= 60 min -> builder shoulders are 10 + 10, combined 20
     session <  60 min -> rule out of scope, no findings at all
   Nothing here asserts that a session is safe — only which written rule a plan
   does or does not satisfy. */

const Analyzer = require('../js/analyzer.js');
const Engine = require('../js/session-builder.js');

const PHASE_FIXTURE = {
  warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'חימום.mp4', source: 'local' },
  plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4', source: 'local' },
  mountain_climber: { id: 'mountain_climber', he: 'מטפס הרים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'מטפס.mp4', source: 'local' },
  crunches: { id: 'crunches', he: 'בטן', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'בטן.mp4', source: 'local' }
};

function longSession(minutes) {
  return Engine.buildSession({
    focus: 'core', muscles: ['core'], equipment: [], level: null, goal: null,
    duration: minutes, durationSpecified: true, participants: 1
  }, PHASE_FIXTURE);
}

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

function codes(result) {
  return result.findings.map(function (f) { return f.code; });
}

test('phaseBudget gives a 60- and a 90-minute session 10-minute shoulders and never overruns', function () {
  assert.deepEqual(Engine.phaseBudget(60), { warmup: 10, main: 40, cooldown: 10 });
  assert.deepEqual(Engine.phaseBudget(90), { warmup: 10, main: 70, cooldown: 10 });
  assert.deepEqual(Engine.phaseBudget(45), { warmup: 5, main: 35, cooldown: 5 });
  assert.deepEqual(Engine.phaseBudget(20), { warmup: 5, main: 10, cooldown: 5 });
  assert.deepEqual(Engine.phaseBudget(10), { warmup: 5, main: 5, cooldown: 0 });
  for (const minutes of [10, 20, 35, 45, 60, 75, 90, 120]) {
    const b = Engine.phaseBudget(minutes);
    assert.ok(b.warmup + b.main + b.cooldown <= Math.max(minutes, 10),
      minutes + ' minute session over-budgets its phases');
  }
});

test('a 60- and a 90-minute built session satisfies every part of TH-PHASE-DURATION', function () {
  for (const [minutes, main] of [[60, 40], [90, 70]]) {
    const built = longSession(minutes);
    assert.ok(built.workout, minutes + ' minutes produced no workout');
    const durations = built.workout.phases.map(function (p) { return p.duration_minutes; });
    assert.deepEqual(durations, [10, main, 10], minutes + ' minute phase budget');
    const check = Analyzer.checkPhaseDurations(built.workout);
    assert.equal(check.applies, true);
    assert.equal(check.sessionMinutes, minutes);
    assert.equal(check.combinedMinutes, 20);
    assert.deepEqual(codes(check), [], minutes + ' minute session should satisfy the rule');
    assert.deepEqual(codes(built.analysis.phaseDurations), []);
  }
});

test('checkPhaseDurations names every part of the rule a hand-written plan misses', function () {
  const thin = Analyzer.checkPhaseDurations(handPlan(60, 3, 0));
  assert.equal(thin.applies, true);
  assert.equal(thin.warmupMinutes, 3);
  assert.equal(thin.cooldownMinutes, 0);
  assert.equal(thin.combinedMinutes, 3);
  assert.deepEqual(codes(thin), [
    'warmup-below-minimum', 'cooldown-below-minimum', 'combined-outside-reference'
  ]);

  const wide = Analyzer.checkPhaseDurations(handPlan(90, 14, 14));
  assert.equal(wide.combinedMinutes, 28);
  assert.deepEqual(codes(wide), [
    'warmup-above-reference', 'cooldown-above-reference', 'combined-outside-reference'
  ]);

  const gone = Analyzer.checkPhaseDurations(
    handPlan(60, 0, 0, { dropWarmup: true, dropCooldown: true }));
  assert.deepEqual(codes(gone), [
    'warmup-missing', 'cooldown-missing', 'combined-outside-reference'
  ]);

  const exact = Analyzer.checkPhaseDurations(handPlan(60, 5, 5));
  assert.equal(exact.combinedMinutes, 10);
  assert.deepEqual(codes(exact), [], '5 + 5 is the floor of the rule, not a miss');
});

test('the duration rule is out of scope below 60 minutes and reports nothing there', function () {
  const short = Analyzer.checkPhaseDurations(handPlan(45, 0, 0));
  assert.equal(short.applies, false);
  assert.equal(short.sessionMinutes, 45);
  assert.deepEqual(codes(short), []);
  assert.equal(Analyzer.PHASE_DURATION_RULE.appliesFromMinutes, 60);
  assert.equal(Analyzer.PHASE_DURATION_RULE.minPhaseMinutes, 5);
  assert.equal(Analyzer.PHASE_DURATION_RULE.referenceMaxPhaseMinutes, 10);
  assert.equal(Analyzer.PHASE_DURATION_RULE.minCombinedMinutes, 10);
  assert.equal(Analyzer.PHASE_DURATION_RULE.referenceMaxCombinedMinutes, 20);
});

test('duration findings state the rule, never safety, approval, or medical fitness', function () {
  const check = Analyzer.checkPhaseDurations(handPlan(60, 3, 0));
  assert.ok(check.findings.length >= 1);
  for (const finding of check.findings) {
    assert.equal(finding.rule, 'TH-PHASE-DURATION');
    assert.ok(finding.he.length > 0);
    assert.doesNotMatch(finding.he, /בטוח|לא בטוח|מסוכן|מאושר|אישור|רפואי|ACSM/, finding.code);
    assert.equal(Analyzer.claimsOutcome(finding.he), false, finding.code);
  }
  assert.match(check.note, /אין כאן אישור מקצועי/);
  assert.match(check.note, /אין ייעוץ רפואי/);
  assert.equal(check.sourceVerified, false);
  assert.equal(check.rule, 'TH-PHASE-DURATION');
});

/* ── Round-2 follow-up 5: what the 5-minute floor and the 10-minute reference
   actually rest on ────────────────────────────────────────────────────────────
   They sit behind a safety-adjacent rule and neither the author nor the reviewer
   could reach the primary text — every copy found on 2026-09-11 was a flashcard
   site, an uploaded document or a publisher's product page. The wording that was
   read states a floor ("at least 5-10 min"), states no combined figure, and says
   nothing about 60 minutes. These tests keep the code and every readable string
   saying exactly that, so nobody downstream mistakes the number for a standard. */

test('the duration numbers state what they rest on, and which of them are ours', function () {
  const rule = Analyzer.PHASE_DURATION_RULE;
  assert.equal(rule.sourceVerified, false, 'the citation was never verified at first hand');
  assert.deepEqual(rule.ownNumbers,
    ['minCombinedMinutes', 'referenceMaxCombinedMinutes', 'appliesFromMinutes'],
    'the numbers that are TrainerHub\'s own, not the source\'s');

  for (const clause of ['UNVERIFIED SECONDHAND CITATION', 'flashcard', 'publisher product page',
    'never seen by the author or by the reviewer', 'FLOOR, not a window', 'NO combined figure',
    "TrainerHub's own numbers", 'not for display']) {
    assert.ok(rule.source.indexOf(clause) !== -1, 'the English source field must say: ' + clause);
  }

  const he = Analyzer.SOURCE_NOTE_HE;
  assert.equal(rule.sourceNoteHe, he);
  assert.match(he, /מסיכומים משניים/, 'the Hebrew note must say the reading was secondhand');
  assert.match(he, /לא אימתנו/, 'and that it was never verified');
  assert.match(he, /רצפה/, 'and that the wording is a floor');
  assert.match(he, /אינו נוקב במספר משותף/, 'and that no combined figure was stated');
  assert.match(he, /המספרים שלנו/, 'and which numbers are ours');
  assert.doesNotMatch(he, /ACSM|American College|Guidelines for Exercise/,
    'the Hebrew a trainer reads names no organisation');
  assert.equal(Analyzer.claimsOutcome(he), false);

  const check = Analyzer.checkPhaseDurations(handPlan(60, 3, 0));
  assert.equal(check.sourceNote, he, 'the note travels with every result');
  assert.equal(check.sourceVerified, false);
});

test('each finding says whose number it failed, and none of them names a source', function () {
  const thin = Analyzer.checkPhaseDurations(handPlan(60, 3, 0));
  const wide = Analyzer.checkPhaseDurations(handPlan(90, 14, 14));
  const gone = Analyzer.checkPhaseDurations(handPlan(60, 0, 0, { dropWarmup: true, dropCooldown: true }));
  const byCode = {};
  for (const finding of thin.findings.concat(wide.findings, gone.findings)) {
    byCode[finding.code] = finding.he;
    assert.doesNotMatch(finding.he, /ACSM|American College|Guidelines for Exercise/, finding.code);
    assert.equal(Analyzer.claimsOutcome(finding.he), false, finding.code);
  }
  assert.match(byCode['warmup-below-minimum'], /ממקור שני ולא אימתנו/);
  assert.match(byCode['cooldown-below-minimum'], /ממקור שני ולא אימתנו/);
  assert.match(byCode['warmup-above-reference'], /רצפה/, 'not a window');
  assert.match(byCode['warmup-above-reference'], /לא חלון סגור/);
  assert.match(byCode['cooldown-above-reference'], /לא חלון סגור/);
  assert.match(byCode['combined-outside-reference'], /הטווח המשותף הזה שלנו/);
  assert.match(byCode['combined-outside-reference'], /אין במקור מספר משותף/);
  assert.match(byCode['warmup-missing'], /סף 60 הדקות הוא מספר שלנו/);
  assert.match(byCode['cooldown-missing'], /סף 60 הדקות הוא מספר שלנו/);
});

test('the guideline title lives in the code and reaches no page', function () {
  const files = ['index.html', 'weekly.html', 'library.html', 'manage.html', 'offer.html',
    'pitch.html', 'journal.html', 'workout-print.html',
    'frontend/index.html', 'frontend/workout-mode.html'];
  for (const file of files) {
    const page = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(page, /ACSM|American College|Guidelines for Exercise/i, file);
    assert.doesNotMatch(page, /PHASE_DURATION_RULE|checkPhaseDurations|phaseDurations/, file +
      ' renders a rule result: display sourceNote (Hebrew), never source (the English title)');
  }
  assert.match(Analyzer.PHASE_DURATION_RULE.source, /ACSM/, 'the citation itself stays in the code');
});

/* ── Round-2 item 3: the intensity arc ───────────────────────────────────────
   Every intensity below was derived by hand from js/infer.js patterns and levels
   plus the scale written in js/analyzer.js, before the checker existed:
     חימום / מתיחות / פלאנק  core + beginner      = 2
     שכיבות שמיכה            push + beginner      = 3
     מטפס הרים               plyo + beginner      = 4
     מתח אוסטרלי             pull + intermediate  = 4
     מטפס הרים (intermediate) plyo + intermediate = 5
   A phase scores the highest of its exercises; an empty phase scores 0. */

const ARC = {
  warm: { name: 'Warm-up', exercises: [{ name: 'חימום' }] },
  cool: { name: 'Cool-down', exercises: [{ name: 'מתיחות' }] },
  main: { name: 'Main', exercises: [{ name: 'שכיבות שמיכה' }, { name: 'מטפס הרים' }] },
  plyo: { name: 'Main', exercises: [{ name: 'מטפס הרים' }] },
  calm: { name: 'Main', exercises: [{ name: 'פלאנק' }] },
  hard: { name: 'Main', exercises: [{ name: 'מטפס הרים', level: 'intermediate' }] },
  barWarm: { name: 'Warm-up', exercises: [{ name: 'מתח אוסטרלי' }] },
  barCool: { name: 'Cool-down', exercises: [{ name: 'מתח אוסטרלי' }] },
  emptyCool: { name: 'Cool-down', exercises: [] }
};

function arcCodes(phases) {
  return Analyzer.validateIntensityArc(phases).findings.map(function (f) { return f.code; });
}

test('validateIntensityArc accepts warm-up to conditioning to cool-down with one peak', function () {
  const good = Analyzer.validateIntensityArc([ARC.warm, ARC.main, ARC.cool]);
  assert.equal(good.ok, true);
  assert.deepEqual(good.intensities, [2, 4, 2]);
  assert.equal(good.peakIndex, 1);
  assert.deepEqual(good.findings, []);

  const built = longSession(60);
  const fromBuilder = Analyzer.validateIntensityArc(built.workout);
  assert.deepEqual(fromBuilder.findings, [], 'a built session must satisfy its own arc rule');
  assert.equal(fromBuilder.ok, true);
  assert.equal(built.analysis.intensityArc.ok, true);
});

test('validateIntensityArc rejects conditioning before warm-up and a missing cool-down', function () {
  assert.deepEqual(arcCodes([ARC.plyo, ARC.warm, ARC.cool]), ['warmup-not-first']);
  assert.deepEqual(arcCodes([ARC.warm, ARC.plyo]), ['cooldown-missing']);
  assert.deepEqual(arcCodes([ARC.warm, ARC.cool, ARC.plyo]),
    ['cooldown-not-last', 'conditioning-missing'],
    'a cool-down in the middle also leaves nothing between warm-up and cool-down');
  assert.deepEqual(arcCodes([ARC.warm, ARC.cool]), ['conditioning-missing']);
  assert.deepEqual(arcCodes([]), ['phases-missing']);
  assert.deepEqual(arcCodes(null), ['phases-missing']);
});

test('validateIntensityArc needs the rise and the fall, not just the order', function () {
  assert.deepEqual(arcCodes([ARC.barWarm, ARC.calm, ARC.cool]), ['no-rise']);
  assert.deepEqual(arcCodes([ARC.warm, ARC.plyo, ARC.barCool]), ['no-fall']);
  assert.deepEqual(arcCodes([ARC.warm, ARC.plyo, ARC.calm, ARC.hard, ARC.cool]), ['not-monotonic-rise']);
  assert.deepEqual(arcCodes([ARC.warm, ARC.hard, ARC.calm, ARC.plyo, ARC.cool]), ['not-monotonic-fall']);
  assert.deepEqual(
    Analyzer.validateIntensityArc([ARC.warm, ARC.plyo, ARC.calm, ARC.hard, ARC.cool]).intensities,
    [2, 4, 2, 5, 2]);
});

test('a declared but empty cool-down passes the arc and is left to the duration rule', function () {
  const arc = Analyzer.validateIntensityArc([ARC.warm, ARC.plyo, ARC.emptyCool]);
  assert.deepEqual(arc.intensities, [2, 4, 0]);
  assert.deepEqual(arc.findings, []);
  assert.equal(arc.ok, true);
});

test('arc findings describe the plan shape, never a person or a medical verdict', function () {
  const arc = Analyzer.validateIntensityArc([ARC.barWarm, ARC.calm, ARC.cool]);
  assert.ok(arc.findings.length >= 1);
  for (const finding of arc.findings) {
    assert.equal(finding.rule, 'TH-INTENSITY-ARC');
    assert.doesNotMatch(finding.he, /בטוח|לא בטוח|מסוכן|מאושר|אישור|רפואי|ACSM/, finding.code);
    assert.equal(Analyzer.claimsOutcome(finding.he), false, finding.code);
  }
  assert.match(arc.source, /No published guideline was read for it/);
  assert.deepEqual(Analyzer.INTENSITY_SCALE.pattern,
    { core: 2, hinge: 3, squat: 3, push: 3, pull: 3, plyo: 4 });
  assert.deepEqual(Analyzer.INTENSITY_SCALE.level, { beginner: 0, intermediate: 1, advanced: 2 });
});
