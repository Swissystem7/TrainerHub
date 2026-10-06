'use strict';

// The designated warm-up clip ("חימום") belongs to the Warm-up phase, never to
// the Main phase, and the phase minutes of a prompt-built session add up to the
// requested duration. Before this, a full-body / unfocused prompt scored the
// warm-up clip into Main as 3 sets x 8-12 reps and left the Warm-up phase
// empty, and Warm-up 5 + Main (duration - 10) + Cool-down 0 lost 5 minutes.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');

function entry(id, he, muscles, extra) {
  return Object.assign({
    id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner',
    file: he + '.mp4', source: 'local'
  }, extra || {});
}

const WITH_WARMUP = {
  warmup: entry('warmup', 'חימום', ['core']),
  plank: entry('plank', 'פלאנק', ['core']),
  mountain_climber: entry('mountain_climber', 'מטפס הרים', ['core']),
  crunches: entry('crunches', 'כפיפות בטן', ['core']),
  squat: entry('squat', 'סקוואט', ['legs']),
  lunges: entry('lunges', 'לאנג׳ים', ['legs']),
  pushup: entry('pushup', 'שכיבות שמיכה', ['chest', 'triceps'])
};

const NO_WARMUP = Object.keys(WITH_WARMUP).reduce(function (acc, id) {
  if (id !== 'warmup') acc[id] = WITH_WARMUP[id];
  return acc;
}, {});

function phaseMinutes(workout) {
  return workout.phases.reduce(function (sum, ph) { return sum + ph.duration_minutes; }, 0);
}

function mainIds(workout) {
  return workout.phases[1].exercises.map(function (ex) { return ex.id; });
}

test('a full-body prompt keeps the warm-up clip in the Warm-up phase, not in Main', function () {
  TH.setCatalog(WITH_WARMUP);
  const built = Engine.buildSession('אימון גוף מלא 20 דקות', WITH_WARMUP);
  assert.ok(built.workout);
  const warm = built.workout.phases[0];
  assert.equal(warm.name, 'Warm-up');
  assert.deepEqual(warm.exercises.map(function (ex) { return ex.id; }), ['warmup']);
  assert.equal(warm.exercises[0].duration_seconds, 180);
  assert.equal(mainIds(built.workout).indexOf('warmup'), -1);
  assert.ok(mainIds(built.workout).length >= 3);
});

test('an unfocused prompt does not prescribe sets and reps of the warm-up clip', function () {
  TH.setCatalog(WITH_WARMUP);
  const built = Engine.buildSession('אימון למתחילים', WITH_WARMUP);
  assert.ok(built.workout);
  assert.equal(mainIds(built.workout).indexOf('warmup'), -1);
  assert.equal(built.workout.phases[0].exercises.length, 1);
  assert.ok(built.explanation.reasons.every(function (r) { return r.id !== 'warmup'; }));
});

test('phase minutes add up to the requested duration', function () {
  TH.setCatalog(WITH_WARMUP);
  [10, 20, 30, 45, 60].forEach(function (minutes) {
    const built = Engine.buildSession('אימון בטן ' + minutes + ' דקות', WITH_WARMUP);
    assert.ok(built.workout, minutes + ' minutes');
    assert.equal(built.workout.duration_minutes, minutes);
    assert.equal(phaseMinutes(built.workout), minutes, minutes + ' minutes: phases add up');
    assert.equal(built.workout.phases[0].duration_minutes, 5, minutes + ' minutes: 5-minute warm-up');
    assert.equal(built.workout.phases[1].duration_minutes, minutes - 5, minutes + ' minutes: main gets the rest');
    assert.equal(built.workout.phases[2].duration_minutes, 0);
  });
});

test('a very short session skips the warm-up clip instead of a zero-minute warm-up block', function () {
  TH.setCatalog(WITH_WARMUP);
  const built = Engine.buildSession('אימון בטן 5 דקות', WITH_WARMUP);
  assert.ok(built.workout);
  assert.equal(built.workout.phases[0].duration_minutes, 0);
  assert.deepEqual(built.workout.phases[0].exercises, []);
  assert.equal(built.workout.phases[1].duration_minutes, 5);
  assert.equal(phaseMinutes(built.workout), 5);
});

test('without a warm-up clip in the library the Warm-up phase is empty and takes no minutes', function () {
  TH.setCatalog(NO_WARMUP);
  const built = Engine.buildSession('אימון בטן 20 דקות', NO_WARMUP);
  assert.ok(built.workout);
  assert.deepEqual(built.workout.phases[0].exercises, []);
  assert.equal(built.workout.phases[0].duration_minutes, 0);
  assert.equal(built.workout.phases[1].duration_minutes, 20);
  assert.equal(phaseMinutes(built.workout), 20);
});

test('the warm-up clip is not counted as a station of the group plan', function () {
  TH.setCatalog(WITH_WARMUP);
  const built = Engine.buildSession('אימון גוף מלא 30 דקות ל-8 חניכים', WITH_WARMUP);
  assert.ok(built.workout && built.workout.group_plan);
  assert.ok(built.workout.group_plan.stations <= mainIds(built.workout).length);
  assert.equal(mainIds(built.workout).indexOf('warmup'), -1);
});
