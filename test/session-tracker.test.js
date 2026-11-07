'use strict';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
const SessionTracker = require('../js/session-tracker.js');

var mem = {};
var originalLocalStorage;

function createMockStorage() {
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
    },
    setItem: function (k, v) {
      mem[k] = String(v);
    },
    removeItem: function (k) {
      delete mem[k];
    },
    clear: function () {
      mem = {};
    },
    get length() {
      return Object.keys(mem).length;
    },
    key: function (i) {
      return Object.keys(mem)[i] || null;
    }
  };
}

beforeEach(function () {
  originalLocalStorage = global.localStorage;
  mem = {};
  global.localStorage = createMockStorage();
});

afterEach(function () {
  mem = {};
  if (originalLocalStorage !== undefined) {
    global.localStorage = originalLocalStorage;
  } else {
    delete global.localStorage;
  }
});

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

test('TH.saveWorkoutSession and TH.loadWorkoutSession persist under TH.KEYS.activeSession and round-trip correctly', function () {
  var session = SessionTracker.createSession(samplePlan());
  session.complete('warmup');
  var originalState = session.state();

  var saved = TH.saveWorkoutSession(originalState);
  assert.equal(saved, true);

  // Verifying that it persists under TH.KEYS.activeSession in localStorage
  var rawInStorage = global.localStorage.getItem(TH.KEYS.activeSession);
  assert.ok(rawInStorage, 'activeSession should be present in localStorage');
  assert.deepEqual(JSON.parse(rawInStorage), originalState);

  // Verifying that loadWorkoutSession round-trips correctly
  var loadedState = TH.loadWorkoutSession();
  assert.deepEqual(loadedState, originalState);
  assert.equal(statusOf(loadedState, 'warmup'), 'done');
  assert.equal(statusOf(loadedState, 'plank'), 'pending');
  assert.equal(statusOf(loadedState, 'push_up'), 'pending');
});

test('TH.saveWorkoutSession robustness when passed invalid inputs safely returns false', function () {
  var invalidInputs = [
    null,
    undefined,
    0,
    42,
    '',
    'invalid-session',
    true,
    false,
    {},
    { workout: {} },
    { exercises: null },
    { exercises: undefined },
    { exercises: 'not-an-array' },
    { exercises: 123 },
    { exercises: {} }
  ];

  invalidInputs.forEach(function (input) {
    var result = TH.saveWorkoutSession(input);
    assert.equal(result, false, 'Expected false for invalid input: ' + JSON.stringify(input));
  });

  // Verify activeSession in localStorage was not set
  assert.equal(global.localStorage.getItem(TH.KEYS.activeSession), null);
});

test('TH.saveWorkoutSession storage error handling when localStorage throws returns false without unhandled exceptions', function () {
  var session = SessionTracker.createSession(samplePlan());
  var state = session.state();

  // Test QuotaExceededError
  global.localStorage = {
    getItem: function () { return null; },
    setItem: function () {
      var err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    },
    removeItem: function () {}
  };

  assert.doesNotThrow(function () {
    var result = TH.saveWorkoutSession(state);
    assert.equal(result, false);
  });

  // Test blocked storage / SecurityError
  global.localStorage = {
    getItem: function () { throw new Error('SecurityError: blocked storage'); },
    setItem: function () { throw new Error('SecurityError: blocked storage'); },
    removeItem: function () {}
  };

  assert.doesNotThrow(function () {
    var result = TH.saveWorkoutSession(state);
    assert.equal(result, false);
  });
});

test('TH.loadWorkoutSession returns null when no session is saved', function () {
  global.localStorage.removeItem(TH.KEYS.activeSession);
  assert.equal(TH.loadWorkoutSession(), null);
});

test('SessionTracker.createSession robustness when invoked with null, empty object, or plan without phases', function () {
  var nullSession = SessionTracker.createSession(null);
  assert.deepEqual(nullSession.state().exercises, []);
  assert.deepEqual(nullSession.complete('any').exercises, []);

  var undefinedSession = SessionTracker.createSession(undefined);
  assert.deepEqual(undefinedSession.state().exercises, []);

  var emptyObjSession = SessionTracker.createSession({});
  assert.deepEqual(emptyObjSession.state().exercises, []);

  var noPhasesSession = SessionTracker.createSession({ title: 'ללא שלבים' });
  assert.deepEqual(noPhasesSession.state().exercises, []);

  var nullPhasesSession = SessionTracker.createSession({ title: 'שלבים ריקים', phases: null });
  assert.deepEqual(nullPhasesSession.state().exercises, []);

  var emptyPhasesSession = SessionTracker.createSession({ title: 'מערך ריק', phases: [] });
  assert.deepEqual(emptyPhasesSession.state().exercises, []);
});

test('session.complete with an invalid or unknown exercise ID keeps all items in their original status', function () {
  var plan = samplePlan();
  var session = SessionTracker.createSession(plan);

  // Complete warmup to establish non-trivial initial statuses
  session.complete('warmup');
  var beforeState = session.state();
  assert.equal(statusOf(beforeState, 'warmup'), 'done');
  assert.equal(statusOf(beforeState, 'plank'), 'pending');
  assert.equal(statusOf(beforeState, 'push_up'), 'pending');

  var invalidIds = [
    'unknown_exercise',
    'does_not_exist',
    '',
    null,
    undefined,
    12345,
    {},
    ['arr']
  ];

  invalidIds.forEach(function (invalidId) {
    var state = session.complete(invalidId);
    assert.deepEqual(state.exercises, beforeState.exercises);
    assert.equal(statusOf(state, 'warmup'), 'done');
    assert.equal(statusOf(state, 'plank'), 'pending');
    assert.equal(statusOf(state, 'push_up'), 'pending');
  });

  // Verify internal state matches beforeState
  assert.deepEqual(session.state().exercises, beforeState.exercises);
});
