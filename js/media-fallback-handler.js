((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THMediaFallback = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => ({
  getExerciseFallbackContent: (exercise) => {
    var ex = exercise || {};
    var name = ex.name_he || ex.title || 'תרגיל';
    var muscle = ex.muscle_group || 'לא ממוין';
    var steps = ex.steps || ['שמור על יציבות ושליטה מלאה לאורך כל התנועה.', 'בצע לפי טווח החזרות או הזמן המוגדר.'];
    return {
      title: name,
      muscle_group: muscle,
      steps: steps,
      fallbackText: 'המדיה אינה זמינה (מצב אופליין או שגיאת טעינה). להלן הנחיות ביצוע:'
    };
  },
  logBrokenMediaReport: (exerciseId, storage) => {
    if (!exerciseId) return false;
    try {
      var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!store) return false;
      var key = 'trainerhub_broken_media';
      var raw = store.getItem(key);
      var list = [];
      try {
        list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
      } catch (_e) {
        list = [];
      }
      var exists = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i].exerciseId === exerciseId) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        list.push({ exerciseId: exerciseId, timestamp: Date.now() });
        store.setItem(key, JSON.stringify(list));
      }
      return true;
    } catch (_err) {
      return false;
    }
  }
}));
