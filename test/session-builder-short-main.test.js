'use strict';

// A short Main phase holds the sets that fit in its minutes. wantedCount never
// drops below 2 exercises, and every exercise kept the full prescription, so
// «אימון כוח לגב 10 דקות» put 2 x 4 sets with 120 s rest (about 18 minutes)
// into a 5-minute Main phase and «אימון 5 דקות» put 3 x 3 sets (about 13
// minutes) into 5. Workout mode then ran every one of those sets and rests.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');
const Rules = require('../js/rules-with-sources.js');

function entry(id, he, muscles) {
  return { id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner', file: he + '.mp4', source: 'local' };
}

const CATALOG = {
  warmup: entry('warmup', 'חימום', ['core']),
  pullup: entry('pullup', 'מתח', ['back']),
  row: entry('row', 'חתירה אוסטרלית', ['back']),
  superman: entry('superman', 'סופרמן גב', ['back']),
  squat: entry('squat', 'סקוואט', ['legs']),
  lunges: entry('lunges', 'לאנג׳ים', ['legs']),
  bridge: entry('bridge', 'גשר ישבן', ['legs']),
  step_up: entry('step_up', 'עליות מדרגה', ['legs']),
  pushup: entry('pushup', 'שכיבות סמיכה', ['chest']),
  dips: entry('dips', 'מקבילים', ['triceps'])
};

function mainOf(result) {
  return result.workout.phases.filter(function (p) { return p.name === 'Main'; })[0];
}

// Same count as exerciseSeconds in the engine: every set plus its rest, ~3 s a rep.
function mainSeconds(main) {
  return main.exercises.reduce(function (sum, ex) {
    var m = String(ex.reps || '').match(/(\d+)(?:-(\d+))?/);
    var work = ex.duration_seconds || (m ? (Number(m[1]) + Number(m[2] || m[1])) / 2 * 3 : 30);
    return sum + ex.sets * (work + (ex.rest_seconds || 0));
  }, 0);
}

['אימון כוח לגב 10 דקות', 'אימון 5 דקות', 'אימון רגליים 10 דקות', 'אימון רגליים 20 דקות', 'אימון כוח 20 דקות'].forEach(function (prompt) {
  test('«' + prompt + '» fits its Main phase minutes', function () {
    TH.setCatalog(CATALOG);
    const main = mainOf(Engine.buildSession(prompt, CATALOG));
    assert.ok(main.exercises.length >= 2);
    main.exercises.forEach(function (ex) { assert.ok(ex.sets >= 1); });
    assert.ok(mainSeconds(main) <= main.duration_minutes * 60,
      Math.round(mainSeconds(main) / 60) + ' min of work in a ' + main.duration_minutes + '-minute Main');
  });
});

test('a short strength session keeps its reps and rest and trims only the sets', function () {
  TH.setCatalog(CATALOG);
  const main = mainOf(Engine.buildSession('אימון כוח לגב 10 דקות', CATALOG));
  assert.equal(main.duration_minutes, 5);
  main.exercises.forEach(function (ex) {
    assert.equal(ex.sets, 1);
    assert.equal(ex.reps, '4-6');
    assert.equal(ex.rest_seconds, 120);
  });
});

test('a Main phase with room keeps the full prescription', function () {
  TH.setCatalog(CATALOG);
  const main = mainOf(Engine.buildSession('אימון 45 דקות', CATALOG));
  main.exercises.forEach(function (ex) { assert.equal(ex.sets, 3); });
});

test('the rules panel quotes the trimmed sets, not the table', function () {
  TH.setCatalog(CATALOG);
  const short = Rules.findRule(Engine.buildSession('אימון כוח לגב 10 דקות', CATALOG), 'prescription');
  assert.match(short.value, /^סט אחד × 4-6 חזרות/);
  assert.match(short.value, /קוצר מ-4 סטים/);
  const roomy = Rules.findRule(Engine.buildSession('אימון 45 דקות', CATALOG), 'prescription');
  assert.equal(roomy.value, '3 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים');
});
