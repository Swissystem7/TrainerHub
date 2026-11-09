'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem(k, v) { mem[k] = String(v); },
  removeItem(k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Tracker = require('../js/session-tracker.js');

function workout() {
  return {
    title: 'אימון 1',
    phases: [{
      name: 'Main',
      exercises: [
        { name: 'שכיבות סמיכה', id: 'push_up', sets: 4, reps: '4-6' },
        { name: 'סופרמן', id: 'superman', sets: 4, reps: '4-6' }
      ]
    }]
  };
}

test('finishing a workout writes one journal client log with the logged set counts', () => {
  Object.keys(mem).forEach((k) => delete mem[k]);
  const doneAt = '2026-11-09T16:00:00.000Z';
  const plan = TH.compactPlan(workout());
  const first = TH.recordFinishedWorkout({
    name: 'TEST ONLY',
    tid: 't_only',
    title: 'אימון 1',
    doneAt,
    minutes: 12,
    exercises: 1,
    sets: 1,
    skipped: 3,
    plan,
    log: [{ id: 'push_up', sets: [{ reps: 1, weightKg: 1 }] }]
  });
  assert.equal(first.id, 't_only');
  assert.equal(first.logs.length, 1);
  assert.equal(first.logs[0].exercises, 1);
  assert.equal(first.logs[0].sets, 1);
  assert.equal(first.logs[0].ex[0].id, 'push_up');

  TH.recordFinishedWorkout({
    name: 'TEST ONLY',
    tid: 't_only',
    title: 'אימון 1',
    doneAt,
    exercises: 1,
    sets: 1,
    rpe: 3,
    plan,
    log: [{ id: 'push_up', sets: [{ reps: 1, weightKg: 1 }] }]
  });
  const saved = TH.store.get(TH.KEYS.clients, []);
  assert.equal(saved[0].logs.length, 1, 'the same finish is not a second session');
  assert.equal(saved[0].logs[0].rpe, 3);

  const session = Tracker.createSession(TH.expandPlan(saved[0].lastPlan));
  session.complete('push_up');
  const state = session.state();
  assert.equal(state.exercises.length, 2);
  assert.equal(state.exercises.filter((e) => e.status === 'done').length, 1);
});
