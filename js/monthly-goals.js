((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THMonthlyGoals = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  var KEY = 'trainerhub_monthly_goal';

  function saveMonthlyGoal(goalObj, storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || typeof store.setItem !== 'function') {
      return false;
    }
    try {
      store.setItem(KEY, JSON.stringify(goalObj || {}));
      return true;
    } catch (_e) {
      return false;
    }
  }

  function loadMonthlyGoal(storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || typeof store.getItem !== 'function') {
      return null;
    }
    try {
      var val = store.getItem(KEY);
      if (!val) return null;
      return JSON.parse(val);
    } catch (_e) {
      return null;
    }
  }

  function computeMonthlyGoalProgress(goalObj, completedSessionsOrCount) {
    var target =
      goalObj && typeof goalObj.target === 'number' ? goalObj.target : (goalObj && Number(goalObj.target)) || 0;
    if (target <= 0) {
      return { current: 0, target: 0, percent: 0, remaining: 0, completed: true };
    }
    var current = 0;
    if (typeof completedSessionsOrCount === 'number') {
      current = completedSessionsOrCount;
    } else if (Array.isArray(completedSessionsOrCount)) {
      current = completedSessionsOrCount.length;
    }
    if (current < 0) current = 0;
    var pct = Math.round((current / target) * 100);
    if (pct > 100) pct = 100;
    var remaining = target - current;
    if (remaining < 0) remaining = 0;
    return {
      current: current,
      target: target,
      percent: pct,
      remaining: remaining,
      completed: current >= target
    };
  }

  return {
    saveMonthlyGoal: saveMonthlyGoal,
    loadMonthlyGoal: loadMonthlyGoal,
    computeMonthlyGoalProgress: computeMonthlyGoalProgress
  };
});
