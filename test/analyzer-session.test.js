'use strict';

/* Round-2 follow-up 3: analyzeSession must actually run the three round-2 rules.
   The rules themselves are covered one by one in test/analyzer.test.js and
   test/phases.test.js. Nothing there proved that a caller who only has the
   session result gets them: cutting each rule out of analyzeSession and leaving
   an inert empty result in its place kept the whole suite green.

   Each test below therefore does two things at once — it pins findings that an
   inert result cannot have, and it compares the session result with the direct
   call, so dropping the key entirely fails too. Every expected code and count was
   worked out from the rules in js/analyzer.js by hand before this file existed. */

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');

function codes(part) {
  return part.findings.map(function (f) { return f.code; });
}

/* 60 minutes, a 3-minute warm-up and no cool-down at all: the duration rule is in
   scope and misses three of its parts. The main phase holds one bar exercise, so
   the equipment rule has exactly one finding once the session is marked beginner.
   The phase order is Warm-up / Main, with no Cool-down, so the arc rule reports
   the missing cool-down and stops before measuring the rise and the fall. */
function plan(extra) {
  return Object.assign({
    title: 'תוכנית לבדיקת האינטגרציה',
    duration_minutes: 60,
    level: 'beginner',
    phases: [
      { name: 'Warm-up', duration_minutes: 3, exercises: [{ name: 'חימום', id: 'warmup', sets: 1, duration_seconds: 180 }] },
      { name: 'Main', duration_minutes: 57, exercises: [
        { name: 'מתח אוסטרלי', id: 'bodyweight_row', sets: 3, reps: '8-12', rest_seconds: 60 },
        { name: 'פלאנק', id: 'plank', sets: 3, duration_seconds: 40, rest_seconds: 30 }
      ] }
    ]
  }, extra || {});
}

test('analyzeSession runs the phase-duration rule, it does not just leave room for it', function () {
  const workout = plan();
  const session = Analyzer.analyzeSession(workout);
  const direct = Analyzer.checkPhaseDurations(workout);

  assert.deepEqual(codes(session.phaseDurations), [
    'warmup-below-minimum', 'cooldown-missing', 'combined-outside-reference'
  ]);
  assert.equal(session.phaseDurations.applies, true);
  assert.equal(session.phaseDurations.sessionMinutes, 60);
  assert.equal(session.phaseDurations.warmupMinutes, 3);
  assert.equal(session.phaseDurations.cooldownMinutes, 0);
  assert.equal(session.phaseDurations.combinedMinutes, 3);
  assert.equal(session.phaseDurations.rule, 'TH-PHASE-DURATION');
  assert.deepEqual(session.phaseDurations, direct, 'the session result is the rule result');
});

test('analyzeSession runs the beginner-equipment rule over the session it was given', function () {
  const workout = plan();
  const session = Analyzer.analyzeSession(workout);
  const direct = Analyzer.checkBeginnerEquipment(workout);

  assert.equal(session.beginnerEquipment.applies, true);
  assert.equal(session.beginnerEquipment.level, 'beginner');
  assert.deepEqual(codes(session.beginnerEquipment), ['equipment-off-list']);
  assert.deepEqual(session.beginnerEquipment.findings.map(function (f) { return f.id; }), ['bodyweight_row']);
  assert.deepEqual(session.beginnerEquipment.findings[0].equipment, ['bar']);
  assert.deepEqual(session.beginnerEquipment.blocked, ['bar', 'barbell', 'machine']);
  assert.deepEqual(session.beginnerEquipment, direct, 'the session result is the rule result');

  const adult = Analyzer.analyzeSession(plan({ level: 'intermediate' }));
  assert.equal(adult.beginnerEquipment.applies, false, 'the same session, not marked beginner');
  assert.deepEqual(codes(adult.beginnerEquipment), []);

  const kids = Analyzer.analyzeSession(plan({ level: '', tags: ['core', 'kids'] }));
  assert.equal(kids.beginnerEquipment.audience, 'kids');
  assert.deepEqual(codes(kids.beginnerEquipment), ['equipment-off-list']);
});

test('analyzeSession runs the intensity-arc rule over the phases it was given', function () {
  const workout = plan();
  const session = Analyzer.analyzeSession(workout);
  const direct = Analyzer.validateIntensityArc(workout);

  assert.equal(session.intensityArc.ok, false);
  assert.deepEqual(codes(session.intensityArc), ['cooldown-missing']);
  assert.deepEqual(session.intensityArc.intensities, [2, 4], 'core warm-up 2, bar pull 3 with plank 2, plyo none');
  assert.equal(session.intensityArc.rule, 'TH-INTENSITY-ARC');
  assert.deepEqual(session.intensityArc, direct, 'the session result is the rule result');

  const whole = plan();
  whole.phases.push({ name: 'Cool-down', duration_minutes: 7, exercises: [{ name: 'מתיחות', id: 'stretch', sets: 1, duration_seconds: 300 }] });
  const good = Analyzer.analyzeSession(whole);
  assert.equal(good.intensityArc.ok, true, 'warm-up 2, main 4, cool-down 2 is one peak');
  assert.deepEqual(good.intensityArc.intensities, [2, 4, 2]);
  assert.equal(good.intensityArc.peakIndex, 1);
  assert.deepEqual(good.intensityArc, Analyzer.validateIntensityArc(whole));
  assert.deepEqual(codes(good.phaseDurations), ['warmup-below-minimum'],
    'the whole plan still goes through the duration rule');
});

test('the three rule results travel with every session result, next to the older fields', function () {
  const session = Analyzer.analyzeSession(plan());
  for (const key of ['phaseDurations', 'beginnerEquipment', 'intensityArc']) {
    assert.ok(session[key] && typeof session[key] === 'object', key + ' is missing from analyzeSession');
    assert.ok(Array.isArray(session[key].findings), key + ' has no findings list');
    assert.match(session[key].note, /אין כאן אישור מקצועי/, key + ' must carry the shared note');
    assert.match(session[key].rule, /^TH-/);
  }
  assert.ok(session.exercises.length >= 1);
  assert.ok(session.stimulus && session.stimulus.he);
  assert.ok(session.flags.some(function (f) { return f.key === 'no-warmup'; }) === false,
    'this plan does have a warm-up phase with an exercise in it');
});
