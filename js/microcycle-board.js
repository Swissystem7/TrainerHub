(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THMicrocycleBoard = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    var copy = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(function (key) {
      copy[key] = clone(obj[key]);
    });
    return copy;
  }

  function shiftWorkoutDay(schedule, fromIdx, toIdx) {
    if (!schedule || !Array.isArray(schedule.dailyWorkouts)) {
      return schedule;
    }
    var workouts = schedule.dailyWorkouts;
    if (
      typeof fromIdx !== 'number' ||
      typeof toIdx !== 'number' ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= workouts.length ||
      toIdx >= workouts.length ||
      isNaN(fromIdx) ||
      isNaN(toIdx)
    ) {
      return schedule;
    }
    var copySchedule = clone(schedule);
    var list = copySchedule.dailyWorkouts;
    var temp = list[fromIdx];
    list[fromIdx] = list[toIdx];
    list[toIdx] = temp;
    
    // Re-index days
    list.forEach(function (w, i) {
      if (w && typeof w === 'object') {
        w.day = i + 1;
      }
    });
    return copySchedule;
  }

  function insertActiveRecoveryDay(schedule, index) {
    if (!schedule || !Array.isArray(schedule.dailyWorkouts)) {
      return schedule;
    }
    var copySchedule = clone(schedule);
    var workouts = copySchedule.dailyWorkouts;
    var idx = typeof index === 'number' && !isNaN(index) ? index : workouts.length;
    if (idx < 0) idx = 0;
    if (idx > workouts.length) idx = workouts.length;

    var recoveryWorkout = {
      day: idx + 1,
      title: 'התאוששות אקטיבית',
      split: 'recovery',
      phases: [
        {
          name: 'Mobility',
          exercises: [
            {
              name: 'הליכה קלה ומתיחות',
              id: 'rec_walk_mobility',
              sets: 1,
              reps: '10-15 דקות',
              rest_seconds: 0,
              notes: 'התאוששות אקטיבית, ניידות וזרימת דם קלה'
            }
          ]
        }
      ],
      exercises: [
        {
          name: 'הליכה קלה ומתיחות',
          id: 'rec_walk_mobility',
          sets: 1,
          reps: '10-15 דקות',
          rest_seconds: 0,
          notes: 'התאוששות אקטיבית, ניידות וזרימת דם קלה'
        }
      ]
    };

    workouts.splice(idx, 0, recoveryWorkout);
    workouts.forEach(function (w, i) {
      if (w && typeof w === 'object') {
        w.day = i + 1;
      }
    });
    return copySchedule;
  }

  function initMicrocycleBoard() {
    var panels = document.querySelectorAll('#microcycleBoardPanel, .microcycle-board-panel');
    if (!panels.length) return;
    panels.forEach(function (panel) {
      if (panel.dataset.initialized) return;
      panel.dataset.initialized = 'true';
      var btn = panel.querySelector('#addRecoveryDayBtn, .add-recovery-day-btn');
      if (btn) {
        btn.addEventListener('click', function () {
          var event = new CustomEvent('microcycle:add-recovery', { bubbles: true });
          panel.dispatchEvent(event);
        });
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMicrocycleBoard);
    } else {
      initMicrocycleBoard();
    }
  }

  return {
    shiftWorkoutDay: shiftWorkoutDay,
    insertActiveRecoveryDay: insertActiveRecoveryDay,
    initMicrocycleBoard: initMicrocycleBoard
  };
}));
