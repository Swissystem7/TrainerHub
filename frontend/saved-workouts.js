(function (root) {
  'use strict';
  function contentKey(workout) {
    if (!workout || typeof workout !== 'object') return JSON.stringify(workout);
    var copy = Object.assign({}, workout);
    delete copy.savedAt;
    // The editor stamps a fresh saved_id on every «המר», so the same text
    // converted twice used to save as two identical history entries.
    delete copy.saved_id;
    return JSON.stringify(copy);
  }
  function saveWorkouts(store, key, workouts) {
    var existing = store.get(key, []);
    if (!Array.isArray(existing)) throw new Error('רשימת האימונים השמורים אינה תקינה. יש לייצא גיבוי לפני המשך.');
    if (!Array.isArray(workouts) || !workouts.length) throw new Error('אין אימונים לשמירה.');
    var seenSavedIds = {};
    for (var wi = 0; wi < workouts.length; wi++) {
      var savedId = workouts[wi] && workouts[wi].saved_id;
      if (savedId) {
        if (seenSavedIds[savedId]) {
          throw new Error('אימונים עם saved_id זהים נמצאו. יש לוודא שכל אימון בעל saved_id ייחודי.');
        }
        seenSavedIds[savedId] = true;
      }
    }
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
    
    // Check for duplicate workout objects (not just title). savedAt is left out:
    // it changes on every save, so with it a second «שמור» on the same workout
    // (or saving one loaded from the history) kept both copies. The newest wins.
    var uniqueNext = [];
    for (var i = 0; i < next.length; i++) {
      var isDuplicate = false;
      var currentWorkout = contentKey(next[i]);
      for (var j = 0; j < uniqueNext.length; j++) {
        if (contentKey(uniqueNext[j]) === currentWorkout) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        uniqueNext.push(next[i]);
      }
    }
    
    // Older cached core.js versions return undefined after a successful write.
    // Verify the actual data rather than relying on a version-specific return value.
    store.set(key, uniqueNext);
    if (JSON.stringify(store.get(key, null)) !== JSON.stringify(uniqueNext)) throw new Error('השמירה נכשלה. בדקו מקום פנוי והרשאות אחסון בדפדפן. אפשר לייצא JSON לגיבוי.');
    return uniqueNext;
  }
  root.WorkoutLibrary = { save: saveWorkouts };
})(typeof window !== 'undefined' ? window : this);
