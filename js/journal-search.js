/**
 * TrainerHub — local journal history search engine.
 * Classic script / UMD. Namespace: window.THJournalSearch
 * No DOM, no libraries: pure filtering of imported training sessions.
 */
(function (root) {
  'use strict';

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  // A session is compared on its calendar day, not on the exact timestamp.
  // Accepts ISO strings, plain YYYY-MM-DD and Date objects.
  function dayKey(value) {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      return value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate());
    }
    var text = value == null ? '' : String(value).trim();
    if (!text) return '';
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (iso) return iso[0];
    var parsed = new Date(text);
    if (isNaN(parsed.getTime())) return '';
    return parsed.getFullYear() + '-' + pad(parsed.getMonth() + 1) + '-' + pad(parsed.getDate());
  }

  function sessionDate(session) {
    return dayKey(session.doneAt || session.at || session.date || session.day || '');
  }

  function pushName(names, value) {
    var name = String(value == null ? '' : value).trim();
    if (name && names.indexOf(name) === -1) names.push(name);
  }

  // Training sessions keep exercise names in `exercises`, while recorded sets
  // only carry an exerciseId. Both shapes must be searchable by name.
  function sessionExerciseNames(session) {
    var names = [];
    var exercises = session.exercises || session.exerciseNames || [];
    if (typeof exercises === 'string') exercises = [exercises];
    if (Array.isArray(exercises)) {
      exercises.forEach(function (exercise) {
        if (typeof exercise === 'string') pushName(names, exercise);
        else if (exercise && typeof exercise === 'object') {
          pushName(
            names,
            exercise.name || exercise.exerciseName || exercise.title || exercise.id || exercise.exerciseId
          );
        }
      });
    }
    pushName(names, session.exerciseName);
    var sets = session.sets || [];
    if (Array.isArray(sets)) {
      sets.forEach(function (set) {
        if (set && typeof set === 'object') {
          pushName(names, set.exerciseName || set.name || set.exerciseId || set.id);
        }
      });
    }
    return names;
  }

  function firstOption(options, keys) {
    for (var i = 0; i < keys.length; i++) {
      var value = options[keys[i]];
      if (value != null && String(value).trim()) return value;
    }
    return '';
  }

  /**
   * Return the sessions matching an exercise name and/or a date range.
   * Results are always a new array, ordered by calendar day (oldest first).
   * Empty/null options simply return every session in that order.
   */
  function filterJournalSessions(sessions, queryOptions) {
    var rows = Array.isArray(sessions) ? sessions.slice() : [];
    var options = typeof queryOptions === 'string' ? { exerciseName: queryOptions } : queryOptions;
    options = options && typeof options === 'object' ? options : {};

    var name = String(firstOption(options, ['exerciseName', 'exercise', 'name', 'query']))
      .trim()
      .toLowerCase();
    var from = dayKey(firstOption(options, ['startDate', 'start', 'from']));
    var to = dayKey(firstOption(options, ['endDate', 'end', 'to']));

    var matches = rows.filter(function (session) {
      if (!session || typeof session !== 'object') return false;
      if (from || to) {
        var day = sessionDate(session);
        if (!day) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      if (name) {
        var found = sessionExerciseNames(session).some(function (exercise) {
          return exercise.toLowerCase().indexOf(name) !== -1;
        });
        if (!found) return false;
      }
      return true;
    });

    return matches.sort(function (a, b) {
      var left = sessionDate(a);
      var right = sessionDate(b);
      if (left === right) return 0;
      if (!left) return 1;
      if (!right) return -1;
      return left < right ? -1 : 1;
    });
  }

  var api = { filterJournalSessions: filterJournalSessions };
  root.THJournalSearch = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
