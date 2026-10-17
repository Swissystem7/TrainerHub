'use strict';

// The rest step previews what comes next. buildSteps only read reps or a time,
// so before a distance row («ספרינט 6x50 מטר», reps null, note «50 מטר») or a
// to-failure set («מתח מקסימום», note «עד כשל») the «הבא:» line had a name and
// no detail at all. The note is the prescription there, so it is the detail.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TH = require('../js/core.js');
const vm = require('node:vm');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'parse-workout.js'), 'utf8'), ctx);

function loadBuildSteps() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');
  const start = html.indexOf('function buildSteps(workout) {');
  assert.ok(start > -1, 'buildSteps is defined in workout-mode.html');
  const endMatch = /\r?\n  return steps;\r?\n\}/.exec(html.slice(start));
  assert.ok(endMatch, 'buildSteps ends with return steps');
  const src = html.slice(start, start + endMatch.index + endMatch[0].length);
  return new Function('PHASE_LABELS', src + '\nreturn buildSteps;')(TH.PHASE_LABELS);
}

const buildSteps = loadBuildSteps();

function rests(exercises) {
  return buildSteps({ phases: [{ name: 'Main', exercises: exercises }] })
    .filter(function (s) { return s.type === 'rest'; });
}

test('the rest between distance sets previews the distance', function () {
  const r = rests([{ name: 'ספרינט', sets: 3, reps: null, duration_seconds: null, rest_seconds: 60, notes: '50 מטר' }]);
  assert.equal(r.length, 2);
  r.forEach(function (s) {
    assert.equal(s.nextName, 'ספרינט');
    assert.equal(s.nextDetail, '50 מטר');
  });
});

test('the rest before a distance exercise previews its sets and distance', function () {
  const r = rests([
    { name: 'סקוואט', sets: 1, reps: 12, duration_seconds: null, rest_seconds: 45, notes: null },
    { name: 'ספרינט', sets: 6, reps: null, duration_seconds: null, rest_seconds: 0, notes: '50 מטר' },
    { name: 'ריצה', sets: 1, reps: null, duration_seconds: null, rest_seconds: 0, notes: null }
  ]);
  assert.equal(r[0].nextName, 'ספרינט');
  assert.equal(r[0].nextDetail, '6× 50 מטר');
});

test('a single to-failure set previews «עד כשל»', function () {
  const r = rests([
    { name: 'סקוואט', sets: 1, reps: 12, duration_seconds: null, rest_seconds: 45, notes: null },
    { name: 'מתח', sets: 1, reps: null, duration_seconds: null, rest_seconds: 0, notes: 'עד כשל' }
  ]);
  assert.equal(r[0].nextDetail, 'עד כשל');
});

test('reps and time still win over the note', function () {
  const r = rests([
    { name: 'לחיצת חזה', sets: 2, reps: 8, duration_seconds: null, rest_seconds: 90, notes: '80 ק״ג' },
    { name: 'פלאנק', sets: 1, reps: null, duration_seconds: 30, rest_seconds: 0, notes: 'גב ישר' }
  ]);
  assert.equal(r[0].nextDetail, '8 חזרות');
  assert.equal(r[1].nextDetail, '30″');
});

test('a parsed «ספרינט 6x50 מטר» line reaches the preview with its distance', function () {
  const parsed = ctx.window.parseWorkoutClient('אימון ריצה\nספרינט 6x50 מטר מנוחה 60 שניות');
  const ex = parsed.phases.map(function (p) { return p.exercises; }).flat()
    .find(function (e) { return e.name === 'ספרינט'; });
  assert.ok(ex, 'the sprint line was parsed');
  assert.equal(ex.reps, null);
  assert.equal(ex.sets, 6);
  const r = buildSteps(parsed).filter(function (s) { return s.type === 'rest'; });
  // Five rests between the six sprints, then one before the added cool-down.
  assert.equal(r.length, 6);
  r.slice(0, 5).forEach(function (s) {
    assert.equal(s.nextName, 'ספרינט');
    assert.equal(s.nextDetail, '50 מטר');
  });
});
