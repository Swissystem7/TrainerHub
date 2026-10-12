/**
 * Ready-made workout library — Hebrew paste text + title search.
 * Classic script. Namespace: window.THReadyWorkouts
 */
(function (root) {
  'use strict';

  var THIngest = root.THIngest;
  var seed = [];

  if (typeof module === 'object' && module.exports) {
    THIngest = require('./ingest.js');
    seed = require('./ready-workouts.json');
  }

  function createReadyWorkouts(entries) {
    var all = Array.isArray(entries) ? entries.slice() : [];

    function search(query) {
      if (query === undefined || query === null) {
        return all.slice();
      }
      if (typeof query !== 'string') {
        return [];
      }
      var q = query.trim().toLowerCase();
      if (!q) {
        return all.slice();
      }
      return all.filter(function (entry) {
        return entry && typeof entry.title === 'string' && entry.title.toLowerCase().indexOf(q) !== -1;
      });
    }

    function toWorkout(entry) {
      if (!entry) {
        return null;
      }
      var text = typeof entry === 'string' ? entry : entry.text;
      if (!text || !THIngest || typeof THIngest.ingestText !== 'function') {
        return null;
      }
      return THIngest.ingestText(text);
    }

    return {
      all: all,
      search: search,
      toWorkout: toWorkout
    };
  }

  var api = createReadyWorkouts(seed);
  api.createReadyWorkouts = createReadyWorkouts;

  root.THReadyWorkouts = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
