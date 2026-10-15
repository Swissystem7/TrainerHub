'use strict';

// The exercise count of a prompt-built session honors the prescription, not
// only the requested minutes. Before this, wantedCount(duration) read a fixed
// step calibrated on 3 sets x 8-12 with 60 s rest, so «אימון כוח 20 דקות» got
// 5 exercises of 4 sets with 120 s rest: 40 minutes of rest inside a
// «20 minute» workout, and workout mode ran every one of those rests.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');
const Prompt = require('../js/prompt-parser.js');
const Rules = require('../js/rules-with-sources.js');

function entry(id, he, muscles, extra) {
  return Object.assign({
    id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner',
    file: he + '.mp4', source: 'local'
  }, extra || {});
}

const LEGS = {
  warmup: entry('warmup', 'חימום', ['core']),
  squat: entry('squat', 'סקוואט', ['legs']),
  lunges: entry('lunges', 'לאנג׳ים', ['legs']),
  wall_sit: entry('wall_sit', 'ישיבה על הקיר', ['legs']),
  jump_squat: entry('jump_squat', 'סקוואט קפיצה', ['legs']),
  calf_raise: entry('calf_raise', 'עליות על קצות האצבעות', ['legs']),
  glute_bridge: entry('glute_bridge', 'גשר ישבן', ['legs']),
  step_up: entry('step_up', 'עליות מדרגה', ['legs']),
  split_squat: entry('split_squat', 'סקוואט בולגרי', ['legs'])
};

function mainOf(result) {
  return result.workout.phases.filter(function (p) { return p.name === 'Main'; })[0];
}

// Workout mode plays a rest after every set except the very last one, so this
// is what the trainee actually waits through.
function restMinutes(exercises) {
  var total = exercises.reduce(function (sum, ex) {
    return sum + (Number(ex.sets) || 1) * (Number(ex.rest_seconds) || 0);
  }, 0);
  var last = exercises[exercises.length - 1];
  if (last) total -= Number(last.rest_seconds) || 0;
  return total / 60;
}

test('a strength session fits its minutes instead of carrying the hypertrophy count', function () {
  TH.setCatalog(LEGS);
  const strength = Engine.buildSession('אימון רגליים כוח 20 דקות', LEGS);
  const main = mainOf(strength);
  assert.equal(strength.request.goal, 'strength');
  assert.equal(main.exercises.length, 2);
  main.exercises.forEach(function (ex) {
    assert.equal(ex.sets, 4);
    assert.equal(ex.rest_seconds, 120);
  });
  assert.ok(restMinutes(main.exercises) <= main.duration_minutes,
    'rest alone must not exceed the Main phase minutes');
  assert.equal(strength.satisfied, true);
  assert.equal(strength.notice, null);
});

test('the default prescription keeps the fixed steps', function () {
  TH.setCatalog(LEGS);
  const plain = Engine.buildSession('אימון רגליים 20 דקות', LEGS);
  assert.equal(plain.request.goal, null);
  assert.equal(mainOf(plain).exercises.length, 5);
  const endurance = Engine.buildSession('אימון רגליים סבולת 20 דקות', LEGS);
  assert.equal(endurance.request.goal, 'endurance');
  assert.equal(mainOf(endurance).exercises.length, 5);
});

test('wantedCount shrinks only for a heavier prescription and never below 2', function () {
  const rx = Engine.prescription({ goal: 'strength' });
  assert.equal(Engine.wantedCount(45), 8);
  assert.equal(Engine.wantedCount(45, Engine.prescription({ goal: 'hypertrophy' })), 8);
  assert.equal(Engine.wantedCount(45, Engine.prescription({ goal: 'endurance' })), 8);
  assert.equal(Engine.wantedCount(45, Engine.prescription({ focus: 'core' })), 8);
  assert.equal(Engine.wantedCount(45, rx), 4);
  assert.equal(Engine.wantedCount(30, rx), 3);
  assert.equal(Engine.wantedCount(20, rx), 2);
  assert.equal(Engine.wantedCount(10, rx), 2);
  assert.equal(Engine.wantedCount(60, rx), 5);
});

test('the rules panel quotes the count the engine actually builds', function () {
  TH.setCatalog(LEGS);
  const text = 'אימון רגליים כוח 45 דקות ל-12 חניכים';
  const built = Engine.buildSession(Prompt.parsePrompt(text), LEGS);
  const rules = Rules.rulesWithSources(text).rules;
  const count = rules.filter(function (r) { return r.id === 'exercise_count'; })[0];
  assert.match(count.value, new RegExp('^' + mainOf(built).exercises.length + ' תרגילים'));
  const stations = rules.filter(function (r) { return r.id === 'participants'; })[0];
  assert.equal(stations.value, built.workout.group_plan.he);
});
