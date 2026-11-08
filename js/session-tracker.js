/**
 * Live workout session — tracks which plan exercises are done vs pending.
 * Classic script. Namespace: window.THSessionTracker
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'trainerhub_active_session';

  function isNegativeOrNaN(val) {
    if (val === undefined || val === null) return false;
    var n = typeof val === 'number' ? val : Number(val);
    return isNaN(n) || n < 0;
  }

  function normalizeDurations(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (isNegativeOrNaN(obj.duration)) {
      try {
        obj.duration = 0;
      } catch (e) {}
    }
    if (isNegativeOrNaN(obj.duration_minutes)) {
      try {
        obj.duration_minutes = 0;
      } catch (e) {}
    }
    return obj;
  }

  function exerciseRows(workout) {
    var rows = [];
    var seen = {};
    if (!workout || typeof workout !== 'object') return rows;
    (Array.isArray(workout.phases) ? workout.phases : []).forEach(function (ph) {
      if (!ph || typeof ph !== 'object') return;
      (Array.isArray(ph.exercises) ? ph.exercises : []).forEach(function (ex) {
        if (!ex) return;
        var id = ex.id || ex.name;
        if (!id) return;
        id = String(id);
        if (seen[id]) return;
        seen[id] = true;
        rows.push({ id: id, status: 'pending' });
      });
    });
    return rows;
  }

  function snapshot(workout, exercises) {
    var w = workout;
    if (w && typeof w === 'object') {
      normalizeDurations(w);
      if (isNegativeOrNaN(w.duration) || isNegativeOrNaN(w.duration_minutes)) {
        var copy = {};
        for (var k in w) {
          if (Object.prototype.hasOwnProperty.call(w, k)) {
            copy[k] = w[k];
          }
        }
        if (isNegativeOrNaN(copy.duration)) copy.duration = 0;
        if (isNegativeOrNaN(copy.duration_minutes)) copy.duration_minutes = 0;
        w = copy;
      }
    }
    return {
      workout: w,
      exercises: (exercises || []).map(function (e) {
        return { id: e.id, status: e.status === 'done' ? 'done' : 'pending' };
      })
    };
  }

  /**
   * @param {object} workoutPlan phased workout from the builder or library
   * @returns {{ state: function, complete: function }}
   */
  function createSession(workoutPlan) {
    var workout = (workoutPlan && typeof workoutPlan === 'object') ? workoutPlan : {};
    normalizeDurations(workout);
    var exercises = exerciseRows(workout);
    var current = snapshot(workout, exercises);

    return {
      state: function () {
        return snapshot(current.workout, current.exercises);
      },
      complete: function (exerciseId) {
        var id = String(exerciseId || '');
        current.exercises = current.exercises.map(function (item) {
          if (item.id !== id) return item;
          return { id: item.id, status: 'done' };
        });
        return snapshot(current.workout, current.exercises);
      }
    };
  }

  function resolveStorage(storage) {
    if (storage) return storage;
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof root !== 'undefined' && root.localStorage) return root.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return null;
  }

  /**
   * Saves active session state to storage.
   * @param {object} sessionState
   * @param {object} [storage] Storage implementation (defaults to global localStorage)
   * @returns {boolean} True on success, false on failure
   */
  function saveSession(sessionState, storage) {
    if (!sessionState || typeof sessionState !== 'object') {
      return false;
    }
    if (!Array.isArray(sessionState.exercises)) {
      return false;
    }
    try {
      normalizeDurations(sessionState);
      if (sessionState.workout && typeof sessionState.workout === 'object') {
        normalizeDurations(sessionState.workout);
      }

      var targetStorage = resolveStorage(storage);
      if (!targetStorage || typeof targetStorage.setItem !== 'function') {
        return false;
      }

      var toSave = sessionState;
      if (isNegativeOrNaN(toSave.duration) || isNegativeOrNaN(toSave.duration_minutes) ||
          (toSave.workout && (isNegativeOrNaN(toSave.workout.duration) || isNegativeOrNaN(toSave.workout.duration_minutes)))) {
        var stateCopy = Object.assign({}, toSave);
        if (isNegativeOrNaN(stateCopy.duration)) stateCopy.duration = 0;
        if (isNegativeOrNaN(stateCopy.duration_minutes)) stateCopy.duration_minutes = 0;
        if (stateCopy.workout && typeof stateCopy.workout === 'object') {
          var workoutCopy = Object.assign({}, stateCopy.workout);
          if (isNegativeOrNaN(workoutCopy.duration)) workoutCopy.duration = 0;
          if (isNegativeOrNaN(workoutCopy.duration_minutes)) workoutCopy.duration_minutes = 0;
          stateCopy.workout = workoutCopy;
        }
        toSave = stateCopy;
      }

      var serialized = JSON.stringify(toSave);
      targetStorage.setItem(STORAGE_KEY, serialized);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Loads active session state from storage.
   * @param {object} [storage] Storage implementation (defaults to global localStorage)
   * @returns {object|null} Parsed session state or null on failure/missing
   */
  function loadSession(storage) {
    try {
      var targetStorage = resolveStorage(storage);
      if (!targetStorage || typeof targetStorage.getItem !== 'function') {
        return null;
      }
      var raw = targetStorage.getItem(STORAGE_KEY);
      if (raw == null || raw === '') return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      normalizeDurations(parsed);
      if (parsed.workout && typeof parsed.workout === 'object') {
        normalizeDurations(parsed.workout);
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  var api = {
    createSession: createSession,
    saveSession: saveSession,
    loadSession: loadSession,
    STORAGE_KEY: STORAGE_KEY
  };

  root.THSessionTracker = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
