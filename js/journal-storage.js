/**
 * TrainerHub — local training journal (volume, PRs, progress graph).
 * Classic script / CommonJS. Namespace: window.THJournalStorage
 */
(function (root) {
  'use strict';

  var Analyzer = root.THAnalyzer;

  function getTH() {
    var th = root.TH;
    if (th && th.store) return th;
    if (typeof module === 'object' && module.exports) {
      try { return require('./core.js'); } catch (e) { return th; }
    }
    return th;
  }

  function getAnalyzer() {
    if (Analyzer && typeof Analyzer.enrichJournalEntry === 'function') return Analyzer;
    if (typeof module === 'object' && module.exports) {
      try { return require('./analyzer.js'); } catch (e) {}
    }
    return Analyzer;
  }

  function emptyStore() {
    return { entries: [], personalRecords: {} };
  }

  function loadStore() {
    var TH = getTH();
    var raw = TH.store.get(TH.KEYS.journal, null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyStore();
    return {
      entries: Array.isArray(raw.entries) ? raw.entries.slice() : [],
      personalRecords: raw.personalRecords && typeof raw.personalRecords === 'object'
        ? Object.assign({}, raw.personalRecords)
        : {}
    };
  }

  function persistStore(data) {
    var TH = getTH();
    return TH.store.set(TH.KEYS.journal, {
      entries: (data.entries || []).slice(),
      personalRecords: Object.assign({}, data.personalRecords || {})
    });
  }

  function normalizeSet(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      exerciseId: String(raw.exerciseId || raw.id || '').trim(),
      reps: Number(raw.reps),
      weightKg: Number(raw.weightKg)
    };
  }

  function normalizeEntry(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var sets = Array.isArray(raw.sets) ? raw.sets.map(normalizeSet) : [];
    return {
      id: String(raw.id || '').trim(),
      doneAt: String(raw.doneAt || raw.at || new Date().toISOString()),
      title: String(raw.title || 'אימון').trim() || 'אימון',
      sets: sets
    };
  }

  function computeVolume(sets) {
    return getTH().workoutVolume(sets);
  }

  function isBetterPr(prev, next) {
    if (!prev) return true;
    if (next.weightKg > prev.weightKg) return true;
    if (next.weightKg === prev.weightKg && next.reps > prev.reps) return true;
    return false;
  }

  function applyPersonalRecords(store, entry) {
    var prs = store.personalRecords || {};
    (entry.sets || []).forEach(function (set) {
      if (!set.exerciseId) return;
      if (!(set.reps > 0) || !(set.weightKg > 0)) return;
      var candidate = {
        exerciseId: set.exerciseId,
        reps: set.reps,
        weightKg: set.weightKg,
        tonnage: Math.round(set.reps * set.weightKg * 10) / 10,
        doneAt: entry.doneAt
      };
      var prev = prs[set.exerciseId];
      if (isBetterPr(prev, candidate)) prs[set.exerciseId] = candidate;
    });
    store.personalRecords = prs;
  }

  function buildProgressGraph(entries) {
    entries = entries || [];
    var byDay = {};
    entries.forEach(function (entry) {
      var day = String(entry.doneAt || '').slice(0, 10);
      if (!day) return;
      var vol = Number(entry.volume);
      if (!isFinite(vol)) vol = computeVolume(entry.sets || []);
      byDay[day] = (byDay[day] || 0) + vol;
    });
    return Object.keys(byDay).sort().map(function (day) {
      return { date: day, volume: Math.round(byDay[day] * 10) / 10 };
    });
  }

  function saveEntry(raw) {
    var entry = normalizeEntry(raw);
    if (!entry.id) entry.id = 'j_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    entry.volume = computeVolume(entry.sets);
    var analyzer = getAnalyzer();
    if (analyzer && typeof analyzer.enrichJournalEntry === 'function') {
      entry = analyzer.enrichJournalEntry(entry);
    }
    var store = loadStore();
    store.entries.push({
      id: entry.id,
      doneAt: entry.doneAt,
      title: entry.title,
      sets: entry.sets.map(function (s) {
        return { exerciseId: s.exerciseId, reps: s.reps, weightKg: s.weightKg };
      }),
      volume: entry.volume
    });
    applyPersonalRecords(store, entry);
    if (!persistStore(store)) return null;
    return {
      id: entry.id,
      doneAt: entry.doneAt,
      title: entry.title,
      sets: entry.sets.slice(),
      volume: entry.volume,
      personalRecords: Object.assign({}, store.personalRecords),
      progressGraph: buildProgressGraph(store.entries)
    };
  }

  function listEntries() {
    return loadStore().entries.slice().sort(function (a, b) {
      return String(a.doneAt || '').localeCompare(String(b.doneAt || ''));
    });
  }

  function getPersonalRecords() {
    return Object.assign({}, loadStore().personalRecords);
  }

  function getJournalSnapshot() {
    var store = loadStore();
    var entries = listEntries();
    return {
      entries: entries,
      personalRecords: Object.assign({}, store.personalRecords),
      progressGraph: buildProgressGraph(entries)
    };
  }

  function clearJournal() {
    return persistStore(emptyStore());
  }

  var api = {
    normalizeEntry: normalizeEntry,
    computeVolume: computeVolume,
    buildProgressGraph: buildProgressGraph,
    saveEntry: saveEntry,
    listEntries: listEntries,
    getPersonalRecords: getPersonalRecords,
    getJournalSnapshot: getJournalSnapshot,
    clearJournal: clearJournal
  };

  root.THJournalStorage = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
