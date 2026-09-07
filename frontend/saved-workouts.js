(function (root) {
  'use strict';
  function saveWorkouts(store, key, workouts) {
    var existing = store.get(key, []);
    if (!Array.isArray(existing)) throw new Error('רשימת האימונים השמורים אינה תקינה. יש לייצא גיבוי לפני המשך.');
    if (!Array.isArray(workouts) || !workouts.length) throw new Error('אין אימונים לשמירה.');
    var entries = workouts.map(function (workout) {
      if (!workout || !workout.title || !Array.isArray(workout.phases) || !workout.phases.length) {
        throw new Error('האימון אינו תקין. השמירה בוטלה.');
      }
      var entry = JSON.parse(JSON.stringify(workout));
      entry.savedAt = new Date().toLocaleString('he-IL');
      return entry;
    });
    // Only replace an explicitly identified workout. Never truncate older entries.
    var ids = entries.map(function (w) { return w.saved_id; }).filter(Boolean);
    var next = entries.concat(existing.filter(function (w) { return !w.saved_id || ids.indexOf(w.saved_id) === -1; }));
    // Older cached core.js versions return undefined after a successful write.
    // Verify the actual data rather than relying on a version-specific return value.
    store.set(key, next);
    if (JSON.stringify(store.get(key, null)) !== JSON.stringify(next)) throw new Error('השמירה נכשלה. בדקו מקום פנוי והרשאות אחסון בדפדפן. אפשר לייצא JSON לגיבוי.');
    return next;
  }
  root.WorkoutLibrary = { save: saveWorkouts };
})(typeof window !== 'undefined' ? window : this);
