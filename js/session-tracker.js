/**
 * Live workout session — tracks which plan exercises are done vs pending.
 * Classic script. Namespace: window.THSessionTracker
 */
(function (root) {
  'use strict';

  function exerciseRows(workout) {
    var rows = [];
    var seen = {};
    (workout && workout.phases || []).forEach(function (ph) {
      (ph.exercises || []).forEach(function (ex) {
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
    return {
      workout: workout,
      exercises: exercises.map(function (e) {
        return { id: e.id, status: e.status === 'done' ? 'done' : 'pending' };
      })
    };
  }

  /**
   * @param {object} workoutPlan phased workout from the builder or library
   * @returns {{ state: function, complete: function }}
   */
  function createSession(workoutPlan) {
    var workout = workoutPlan || {};
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

  var api = {
    createSession: createSession
  };

  root.THSessionTracker = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
