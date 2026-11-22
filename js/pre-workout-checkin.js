((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THPreWorkoutCheckin = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  function evaluatePreWorkoutCheckin(energyLevel, sorenessArea, workout) {
    var adaptedWorkout = workout ? JSON.parse(JSON.stringify(workout)) : { phases: [] };
    var recommendations = [];
    var energyNum = Number(energyLevel) || 5;

    if (energyNum <= 2) {
      recommendations.push('אנרגיה נמוכה: מומלץ להפחית 20% מהמשקלים או לבצע אימון קל יותר.');
      if (adaptedWorkout && Array.isArray(adaptedWorkout.phases)) {
        adaptedWorkout.phases.forEach((phase) => {
          if (Array.isArray(phase.exercises)) {
            phase.exercises.forEach((ex) => {
              if (ex?.sets && ex.sets > 1) {
                ex.sets = Math.max(1, ex.sets - 1);
              }
            });
          }
        });
      }
    } else {
      recommendations.push('אנרגיה תקינה: ניתן להמשיך כמתוכנן.');
    }

    var soreness = sorenessArea ? String(sorenessArea).trim().toLowerCase() : '';
    if (soreness && soreness !== 'none' && soreness !== 'אין') {
      recommendations.push(
        `אזור רגיש (${soreness}): סומנו תתרגילים רגישים עם המלצת הפחתה או החלפה. במקרה של כאב מתמשך יש לפנות לאיש מקצוע.`
      );
      if (adaptedWorkout && Array.isArray(adaptedWorkout.phases)) {
        adaptedWorkout.phases.forEach((phase) => {
          if (Array.isArray(phase.exercises)) {
            phase.exercises.forEach((ex) => {
              if (ex?.name) {
                var nameLower = String(ex.name).toLowerCase();
                if (
                  soreness.indexOf('כתף') !== -1 &&
                  (nameLower.indexOf('כתף') !== -1 ||
                    nameLower.indexOf('לחץ') !== -1 ||
                    nameLower.indexOf('press') !== -1)
                ) {
                  ex.notes = `${ex.notes ? `${ex.notes} ` : ''}[התאמת רגישות כתף: הפחתת עומס או החלפה בתרגיל ללא כאب]`;
                } else if (
                  soreness.indexOf('ברך') !== -1 &&
                  (nameLower.indexOf('סקוואט') !== -1 ||
                    nameLower.indexOf('לאנץ') !== -1 ||
                    nameLower.indexOf('squat') !== -1)
                ) {
                  ex.notes = `${ex.notes ? `${ex.notes} ` : ''}[התאמת רגישות ברך: הפחתת טווח תנועה או החלפה]`;
                } else if (
                  soreness.indexOf('גב') !== -1 &&
                  (nameLower.indexOf('דדליפט') !== -1 ||
                    nameLower.indexOf('פלאנק') !== -1 ||
                    nameLower.indexOf('deadlift') !== -1)
                ) {
                  ex.notes = `${ex.notes ? `${ex.notes} ` : ''}[התאמת רגישות גב תחתון: שמירה על ניטרליות או הפחתת עומס]`;
                }
              }
            });
          }
        });
      }
    }

    return {
      energyLevel: energyNum,
      sorenessArea: soreness,
      recommendations: recommendations,
      adaptedWorkout: adaptedWorkout
    };
  }

  function saveCheckinRecord(record, storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return false;
    try {
      var list = [];
      var raw = store.getItem('trainerhub_checkins');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }
      list.push(Object.assign({ at: new Date().toISOString() }, record));
      store.setItem('trainerhub_checkins', JSON.stringify(list));
      return true;
    } catch (_e) {
      return false;
    }
  }

  function initPreWorkoutUI() {
    if (typeof document === 'undefined') return;
    var panel = document.getElementById('preWorkoutCheckinPanel');
    var btn = document.getElementById('applyCheckinBtn');
    if (panel && btn) {
      btn.addEventListener('click', () => {
        var energyInput = document.getElementById('checkinEnergyInput');
        var sorenessInput = document.getElementById('checkinSorenessInput');
        var energy = energyInput ? energyInput.value : 5;
        var soreness = sorenessInput ? sorenessInput.value : 'none';
        var result = evaluatePreWorkoutCheckin(energy, soreness, window.__currentWorkout);
        saveCheckinRecord(result);
        if (typeof renderWorkout === 'function' && result.adaptedWorkout) {
          renderWorkout(result.adaptedWorkout);
        }
      });
    }
  }

  if (typeof window !== 'undefined') {
    window.THPreWorkoutCheckin = {
      evaluatePreWorkoutCheckin: evaluatePreWorkoutCheckin,
      saveCheckinRecord: saveCheckinRecord,
      initPreWorkoutUI: initPreWorkoutUI
    };
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPreWorkoutUI);
      } else {
        initPreWorkoutUI();
      }
    }
  }

  return {
    evaluatePreWorkoutCheckin: evaluatePreWorkoutCheckin,
    saveCheckinRecord: saveCheckinRecord,
    initPreWorkoutUI: initPreWorkoutUI
  };
});
