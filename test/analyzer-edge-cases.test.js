'use strict';

/* Round-2 follow-up, the cheap notes: the defensive branches of the new rules,
   and the gap the reviewer found in the equipment rule — an exercise the
   catalogue does not know AND that declares no equipment used to pass in silence,
   so "Barbell back squat" typed by hand slipped through a beginner session.

   The catalogue is loaded here, which is what lets the rule tell an unrecognised
   name from a known bodyweight one. No clock, no randomness, no network. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Analyzer = require('../js/analyzer.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

function beginnerSession(exercises) {
  return {
    title: 'בדיקה',
    duration_minutes: 30,
    level: 'beginner',
    phases: [{ name: 'Main', duration_minutes: 30, exercises: exercises }]
  };
}

function codes(result) {
  return result.findings.map(function (f) { return f.code; });
}

test('an exercise the catalogue does not know, with no equipment of its own, is not passed over', function () {
  const check = Analyzer.checkBeginnerEquipment(beginnerSession([
    { name: 'Barbell back squat', id: 'freehand-1', sets: 3, reps: 5 },
    { name: 'Smith machine press', id: 'freehand-2', equipment: [], sets: 3, reps: 5 }
  ]));
  assert.equal(check.applies, true);
  assert.deepEqual(codes(check), ['equipment-unknown', 'equipment-unknown']);
  for (const finding of check.findings) {
    assert.equal(finding.rule, 'TH-BEGINNER-EQUIPMENT');
    assert.deepEqual(finding.equipment, []);
    assert.match(finding.he, /לא יכול לדעת באיזה ציוד/);
    assert.match(finding.he, /לא רצה על התרגיל הזה/, 'it says the check did not run, not that the exercise is bad');
    assert.doesNotMatch(finding.he, /בטוח|לא בטוח|מסוכן|אסור|מאושר|אישור|רפואי/, finding.id);
    assert.equal(Analyzer.claimsOutcome(finding.he), false);
  }
  assert.match(check.findings[0].he, /Barbell back squat/);
  assert.match(check.findings[1].he, /Smith machine press/);
});

test('a known exercise, or one that declares its equipment, is judged and not merely skipped', function () {
  const known = Analyzer.checkBeginnerEquipment(beginnerSession([
    { name: 'פלאנק', id: 'plank', sets: 3, duration_seconds: 40 },
    { name: 'מתח אוסטרלי', id: 'bodyweight_row', sets: 3, reps: 10 }
  ]));
  assert.deepEqual(codes(known), ['equipment-off-list'], 'the bar is named, the plank is quiet');
  assert.equal(known.findings[0].id, 'bodyweight_row');

  const declared = Analyzer.checkBeginnerEquipment(beginnerSession([
    { name: 'Barbell back squat', id: 'freehand-1', equipment: ['barbell'], sets: 3, reps: 5 },
    { name: 'Rowing something', id: 'freehand-3', equipment: ['band'], sets: 3, reps: 12 }
  ]));
  assert.deepEqual(codes(declared), ['equipment-off-list'], 'a declared band is known equipment, not unknown');
  assert.deepEqual(declared.findings[0].equipment, ['barbell']);

  const notBeginner = Analyzer.checkBeginnerEquipment(
    Object.assign(beginnerSession([{ name: 'Barbell back squat', id: 'freehand-1' }]), { level: 'advanced' }));
  assert.equal(notBeginner.applies, false);
  assert.deepEqual(codes(notBeginner), [], 'the rule still does not run outside beginner or kids');
});

test('the rules answer on empty, partial and malformed input instead of throwing', function () {
  const nothing = Analyzer.checkPhaseDurations(null);
  assert.equal(nothing.applies, false);
  assert.equal(nothing.sessionMinutes, 0);
  assert.equal(nothing.combinedMinutes, 0);
  assert.deepEqual(nothing.findings, []);

  // no declared duration: the session length is the sum of its phases, and a
  // phase with an unusable number contributes nothing
  const summed = Analyzer.checkPhaseDurations({
    phases: [
      { name: 'Warm-up', duration_minutes: 10, exercises: [] },
      { name: 'Main', duration_minutes: 'forty', exercises: [] },
      { name: 'Main', duration_minutes: 40, exercises: [] },
      { name: 'Cool-down', duration_minutes: -5, exercises: [] }
    ]
  });
  assert.equal(summed.sessionMinutes, 50);
  assert.equal(summed.warmupMinutes, 10);
  assert.equal(summed.cooldownMinutes, 0);
  assert.equal(summed.applies, false, '50 minutes is below the 60-minute scope');

  assert.equal(Analyzer.checkBeginnerEquipment(null).applies, false);
  assert.equal(Analyzer.checkBeginnerEquipment(null, { level: 'beginner' }).applies, true);
  assert.deepEqual(Analyzer.checkBeginnerEquipment(null, { level: 'beginner' }).findings, []);
  assert.equal(Analyzer.checkBeginnerEquipment({ tags: ['kids'] }).audience, 'kids');

  assert.deepEqual(codes(Analyzer.validateIntensityArc({ phases: [] })), ['phases-missing']);
  assert.deepEqual(codes(Analyzer.validateIntensityArc(undefined)), ['phases-missing']);
  assert.deepEqual(codes(Analyzer.validateIntensityArc([null, { name: 'Main', exercises: [] }])),
    ['warmup-not-first', 'cooldown-missing']);
});

test('the taxonomy checker survives entries that are not objects at all', function () {
  const report = Analyzer.checkCatalogTaxonomy({
    fine: { id: 'fine', he: 'טוב', muscles: ['core'], equipment: ['none'], level: 'beginner' },
    a_string: 'not an entry',
    nothing: null
  });
  assert.equal(report.ok, false);
  assert.equal(report.total, 3);
  assert.deepEqual(report.problems.map(function (r) { return [r.id, r.field]; }),
    [['a_string', 'entry'], ['nothing', 'entry']]);
  for (const problem of report.problems) {
    assert.ok(problem.he.indexOf(problem.id) !== -1, problem.he);
  }
  assert.deepEqual(Analyzer.checkCatalogTaxonomy('a string').problems.map(function (r) { return r.field; }),
    ['catalog']);
});

test('analyzeExercise and flattenWorkout take whatever shape they are handed', function () {
  const empty = Analyzer.analyzeExercise(null);
  assert.equal(empty.he, '');
  assert.equal(empty.primary, 'core');
  assert.deepEqual(empty.muscles, ['core'], 'an empty name falls back to the default core');

  const byName = Analyzer.analyzeExercise('פלאנק');
  assert.equal(byName.id, 'plank', 'a bare string is looked up in the catalogue');
  assert.equal(byName.primary, 'core');

  const unknownName = Analyzer.analyzeExercise('משהו שלא קיים במאגר');
  assert.equal(unknownName.id, null);
  assert.deepEqual(unknownName.equipment, ['none']);

  assert.deepEqual(Analyzer.flattenWorkout(null), []);
  assert.equal(Analyzer.flattenWorkout([{ name: 'א' }, { name: 'ב' }]).length, 2);
  assert.equal(Analyzer.flattenWorkout({ exercises: [{ name: 'א' }] }).length, 1, 'a phase-less workout');
  const flat = Analyzer.flattenWorkout({ phases: [{ name: 'Main', exercises: [null, { name: 'א' }] }] });
  assert.equal(flat.length, 1, 'an empty slot in a phase is dropped, not analysed');
  assert.equal(flat[0]._phase, 'Main');
});
