/**
 * TrainerHub — מדדי מילואים (reserve fitness pass/fail track).
 * Classic script, no bundler. Namespace: window.THReserves.
 * Data: content/reserves/miluim-track.json
 * Results are stored locally (trainerhub_miluim_results) — never uploaded.
 */
(function (root) {
  'use strict';

  var DATA_PATH = 'content/reserves/miluim-track.json';
  var STORE_KEY = 'trainerhub_miluim_results';
  var data = null;

  function setData(main) {
    data = main || null;
    return api;
  }

  function need() {
    if (!data) throw new Error('reserves track data not loaded');
    return data;
  }

  function loadJson(rel) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var url = root.TH && typeof root.TH.assetUrl === 'function' ? root.TH.assetUrl(rel) : rel;
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function load() {
    if (data) return Promise.resolve(api);
    return loadJson(DATA_PATH).then(function (main) {
      setData(main);
      return api;
    });
  }

  function meta() {
    return need()._meta;
  }

  function tests() {
    return need().tests.slice();
  }

  function testById(id) {
    var list = need().tests;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function demos() {
    return need().demos.slice().sort(function (a, b) {
      return (a.priority || 99) - (b.priority || 99);
    });
  }

  function plan() {
    return need().plan;
  }

  /** Parse m:ss / h:mm:ss / bare seconds → total seconds. */
  function parseClock(v) {
    if (typeof v === 'number') {
      return (!isFinite(v) || v < 0 || Object.is(v, -0)) ? NaN : v;
    }
    if (v == null) return NaN;
    var s = String(v).trim();
    if (!s || s.charAt(0) === '-' || /[^\d:.]/.test(s)) return NaN;
    if (s.indexOf(':') !== -1) {
      var p = s.split(':');
      if (p.length < 2 || p.length > 3) return NaN;
      var total = 0;
      for (var i = 0; i < p.length; i++) {
        if (!p[i] || (i < p.length - 1 && p[i].indexOf('.') !== -1)) return NaN;
        var n = Number(p[i]);
        if (!isFinite(n) || n < 0 || (i > 0 && n >= 60)) return NaN;
        total = total * 60 + n;
      }
      return total;
    }
    var num = Number(s);
    if (!isFinite(num) || num < 0 || Object.is(num, -0)) return NaN;
    return num;
  }

  function formatClock(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '';
    var s = Math.round(seconds);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function normalizeValue(test, raw) {
    if (raw === '' || raw == null) return { ok: false, numeric: NaN, display: '' };
    if (test.input === 'clock') {
      var sec = parseClock(raw);
      if (!isFinite(sec) || sec < 0) return { ok: false, numeric: NaN, display: String(raw) };
      return { ok: true, numeric: sec, display: formatClock(sec) };
    }
    var n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
    if (!isFinite(n) || n < 0) return { ok: false, numeric: NaN, display: String(raw) };
    return { ok: true, numeric: n, display: String(n) };
  }

  function passesThreshold(test, numeric) {
    if (!test || !isFinite(numeric)) return false;
    if (test.pass_when === 'lte') return numeric <= test.threshold;
    if (test.pass_when === 'gte') return numeric >= test.threshold;
    return false;
  }

  /**
   * Evaluate one test. raw may be clock string or number.
   * Returns { id, name_he, pass, incomplete, value, display, threshold_display, ... }
   */
  function evaluateTest(testId, raw) {
    var test = testById(testId);
    if (!test) return null;
    if (raw === '' || raw == null) {
      return {
        id: test.id,
        name_he: test.name_he,
        pass: false,
        incomplete: true,
        value: null,
        display: '',
        threshold_display: test.threshold_display,
        pass_when: test.pass_when,
        verified: !!test.verified
      };
    }
    var norm = normalizeValue(test, raw);
    if (!norm.ok) {
      return {
        id: test.id,
        name_he: test.name_he,
        pass: false,
        incomplete: true,
        invalid: true,
        value: null,
        display: norm.display,
        threshold_display: test.threshold_display,
        pass_when: test.pass_when,
        verified: !!test.verified
      };
    }
    var ok = passesThreshold(test, norm.numeric);
    return {
      id: test.id,
      name_he: test.name_he,
      pass: ok,
      incomplete: false,
      value: norm.numeric,
      display: norm.display,
      threshold_display: test.threshold_display,
      pass_when: test.pass_when,
      verified: !!test.verified
    };
  }

  /**
   * results: { [testId]: rawValue }
   * overall: 'pass' | 'fail' | 'incomplete'
   */
  function evaluateAll(results) {
    results = results || {};
    var rows = tests().map(function (t) {
      return evaluateTest(t.id, results[t.id]);
    });
    var anyIncomplete = rows.some(function (r) { return r.incomplete; });
    var allPass = rows.every(function (r) { return r.pass; });
    var overall = anyIncomplete ? 'incomplete' : (allPass ? 'pass' : 'fail');
    return {
      tests: rows,
      allPassed: allPass && !anyIncomplete,
      overall: overall,
      deadline_display_he: meta().deadline_display_he,
      all_must_pass: !!meta().all_must_pass
    };
  }

  function emptyStore() {
    return { results: {}, history: [], feedbacks: {}, lastFeedback: null, lastSessionId: null, updatedAt: null };
  }

  function readStoreRaw() {
    try {
      if (root.TH && root.TH.store && typeof root.TH.store.get === 'function') {
        var viaTh = root.TH.store.get(STORE_KEY, null);
        if (viaTh && typeof viaTh === 'object') return viaTh;
      }
    } catch (e) { /* ignore */ }
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e2) {
      return null;
    }
  }

  function writeStoreRaw(obj) {
    try {
      if (root.TH && root.TH.store && typeof root.TH.store.set === 'function') {
        if (root.TH.store.set(STORE_KEY, obj)) return true;
      }
    } catch (e) { /* ignore */ }
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
      return true;
    } catch (e2) {
      return false;
    }
  }

  function loadResults() {
    var raw = readStoreRaw();
    if (!raw || typeof raw !== 'object') return emptyStore();
    return {
      results: raw.results && typeof raw.results === 'object' ? Object.assign({}, raw.results) : {},
      history: Array.isArray(raw.history) ? raw.history.slice() : [],
      feedbacks: raw.feedbacks && typeof raw.feedbacks === 'object' ? Object.assign({}, raw.feedbacks) : {},
      lastFeedback: raw.lastFeedback || null,
      lastSessionId: raw.lastSessionId || null,
      updatedAt: raw.updatedAt || null
    };
  }

  function saveResults(store) {
    var next = {
      results: Object.assign({}, (store && store.results) || {}),
      history: ((store && store.history) || []).slice(),
      feedbacks: Object.assign({}, (store && store.feedbacks) || {}),
      lastFeedback: (store && store.lastFeedback) || null,
      lastSessionId: (store && store.lastSessionId) || null,
      updatedAt: new Date().toISOString()
    };
    writeStoreRaw(next);
    return next;
  }

  function clearResults() {
    writeStoreRaw(emptyStore());
    return emptyStore();
  }

  /**
   * Log a single test result. checkpoint optional: placement|midpoint|final|practice
   */
  function logResult(testId, raw, checkpoint) {
    var test = testById(testId);
    if (!test) return null;
    var ev = evaluateTest(testId, raw);
    var store = loadResults();
    store.results[testId] = {
      raw: raw,
      value: ev.value,
      display: ev.display,
      pass: ev.pass,
      incomplete: ev.incomplete,
      checkpoint: checkpoint || 'practice',
      at: new Date().toISOString()
    };
    store.history.push({
      testId: testId,
      raw: raw,
      pass: ev.pass,
      checkpoint: checkpoint || 'practice',
      at: store.results[testId].at
    });
    saveResults(store);
    return { evaluation: ev, store: store, summary: evaluateAll(currentRawMap(store)) };
  }

  function currentRawMap(store) {
    store = store || loadResults();
    var map = {};
    Object.keys(store.results || {}).forEach(function (id) {
      var row = store.results[id];
      if (row && row.raw != null) map[id] = row.raw;
    });
    return map;
  }

  function currentSummary() {
    return evaluateAll(currentRawMap());
  }

  function overallLabelHe(overall) {
    if (overall === 'pass') return 'עובר — כל המדדים';
    if (overall === 'fail') return 'לא עובר — יש מדד שלא עמד בסף';
    return 'חסר — עדיין לא הוזנו כל המדדים';
  }


  function feedbackOptions() {
    return (need().feedback && need().feedback.options) ? need().feedback.options.slice() : [];
  }

  function adjustmentFor(feedbackId) {
    var adj = need().feedback && need().feedback.adjustments;
    if (!adj) return null;
    return adj[feedbackId] || null;
  }

  function strengthPlans(filter) {
    filter = filter || {};
    var list = need().strength_plans || [];
    return list.filter(function (p) {
      if (filter.level != null && Number(p.level) !== Number(filter.level)) return false;
      if (filter.equipment && p.equipment !== filter.equipment) return false;
      return true;
    }).map(function (p) {
      return Object.assign({}, p, { sessions: (p.sessions || []).slice() });
    });
  }

  function strengthPlanById(id) {
    var list = need().strength_plans || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function scaleLoad(load, volumeDelta) {
    if (typeof volumeDelta !== 'number' || !isFinite(volumeDelta)) {
      return load;
    }
    var currentSets = (load && typeof load === 'object' && Number(load.sets)) || 3;
    if (currentSets + volumeDelta < 0) {
      return load;
    }
    var target = load && typeof load === 'object' ? Object.assign({}, load) : { sets: 3, effort_he: 'בינוני' };
    var sets = Math.max(2, Math.min(6, currentSets + volumeDelta));
    target.sets = sets;
    if (volumeDelta > 0) target.effort_he = 'מועלה אחרי משוב «קל»';
    if (volumeDelta < 0) target.effort_he = 'מוקל אחרי משוב «לא סיימתי»';
    return target;
  }

  function findPlanSession(sessionId) {
    var sessions = (need().plan && need().plan.sessions) || [];
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === sessionId) return { list: sessions, index: i, session: sessions[i], source: 'plan' };
    }
    var plans = need().strength_plans || [];
    for (var p = 0; p < plans.length; p++) {
      var ss = plans[p].sessions || [];
      for (var j = 0; j < ss.length; j++) {
        if (ss[j].id === sessionId) return { list: ss, index: j, session: ss[j], source: 'strength', planId: plans[p].id };
      }
    }
    return null;
  }

  function recordWorkoutFeedback(sessionId, feedbackId) {
    var ok = false;
    feedbackOptions().forEach(function (o) { if (o.id === feedbackId) ok = true; });
    if (!ok) return null;
    var store = loadResults();
    store.feedbacks = store.feedbacks || {};
    store.feedbacks[sessionId] = { feedbackId: feedbackId, at: new Date().toISOString() };
    store.lastFeedback = feedbackId;
    store.lastSessionId = sessionId;
    saveResults(store);
    return { feedbackId: feedbackId, adjustment: adjustmentFor(feedbackId), store: store };
  }

  /**
   * Build the next session after sessionId, scaled by last (or provided) feedback.
   */
  function nextWorkout(afterSessionId, feedbackId) {
    var found = findPlanSession(afterSessionId);
    if (!found) return null;
    var fb = feedbackId || loadResults().lastFeedback || 'exact';
    var adj = adjustmentFor(fb) || { volume_delta: 0, note_he: '' };
    var nextIndex = found.index + 1;
    if (nextIndex >= found.list.length) {
      return {
        done: true,
        feedbackId: fb,
        adjustment: adj,
        session: null,
        message_he: 'סיימת את רצף האימונים במסלול הזה'
      };
    }
    var base = found.list[nextIndex];
    var scaled = Object.assign({}, base, {
      load: scaleLoad(base.load, adj.volume_delta),
      adjustment_note_he: adj.note_he || '',
      from_feedback: fb
    });
    return {
      done: false,
      feedbackId: fb,
      adjustment: adj,
      session: scaled,
      source: found.source,
      planId: found.planId || null
    };
  }


  var api = {
    DATA_PATH: DATA_PATH,
    STORE_KEY: STORE_KEY,
    setData: setData,
    load: load,
    get data() { return data; },
    meta: meta,
    tests: tests,
    testById: testById,
    demos: demos,
    plan: plan,
    parseClock: parseClock,
    formatClock: formatClock,
    evaluateTest: evaluateTest,
    evaluateAll: evaluateAll,
    loadResults: loadResults,
    saveResults: saveResults,
    clearResults: clearResults,
    logResult: logResult,
    currentRawMap: currentRawMap,
    currentSummary: currentSummary,
    overallLabelHe: overallLabelHe,
    feedbackOptions: feedbackOptions,
    adjustmentFor: adjustmentFor,
    recordWorkoutFeedback: recordWorkoutFeedback,
    nextWorkout: nextWorkout,
    scaleLoad: scaleLoad,
    strengthPlans: strengthPlans,
    strengthPlanById: strengthPlanById,
    findPlanSession: findPlanSession
  };

  root.THReserves = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
