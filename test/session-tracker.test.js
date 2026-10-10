'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
const SessionTracker = require('../js/session-tracker.js');

function statusOf(state, exerciseId) {
  var row = (state.exercises || []).find(function (e) { return e.id === exerciseId; });
  return row ? row.status : undefined;
}

function samplePlan() {
  return {
    title: 'אימון בדיקה',
    duration_minutes: 25,
    phases: [
      {
        name: 'Warm-up',
        exercises: [{ id: 'warmup', name: 'חימום', sets: 1, duration_seconds: 60 }]
      },
      {
        name: 'Main',
        exercises: [
          { id: 'plank', name: 'פלאנק', sets: 3, reps: '8-12' },
          { id: 'push_up', name: 'שכיבות סמיכה', sets: 3, reps: '8-12' }
        ]
      }
    ]
  };
}

test('complete marks one exercise done and leaves others pending', function () {
  var plan = samplePlan();
  var session = SessionTracker.createSession(plan);
  var after = session.complete('plank');

  assert.equal(statusOf(after, 'plank'), 'done');
  assert.equal(statusOf(after, 'push_up'), 'pending');
  assert.equal(statusOf(after, 'warmup'), 'pending');
  assert.equal(statusOf(session.state(), 'plank'), 'done');
});

test('TH.createWorkoutSession exposes the same tracker API', function () {
  var session = TH.createWorkoutSession(samplePlan());
  assert.equal(typeof session.complete, 'function');
  var state = session.complete('warmup');
  assert.equal(statusOf(state, 'warmup'), 'done');
  assert.equal(statusOf(state, 'plank'), 'pending');
});
