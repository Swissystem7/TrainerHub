/**
 * TrainerHub — team safety file helpers.
 * Classic script, no bundler. Namespace: window.THBooklet.
 * Loads content/booklet/team-safety-file.json only. The former coach-course
 * booklet was removed at Aviran's request; site workouts live in js/site-plan.js.
 * Nothing here stores personal data.
 */
(function (root) {
  'use strict';

  var TEAM_PATH = 'content/booklet/team-safety-file.json';
  var team = null;

  function setData(mainIgnored, teamFile) {
    // mainIgnored kept for call-site compatibility (older tests / pages).
    team = teamFile || null;
    return api;
  }

  function loadJson(rel) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var url = root.TH && typeof root.TH.assetUrl === 'function' ? root.TH.assetUrl(rel) : rel;
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function load() {
    if (team) return Promise.resolve(api);
    return loadJson(TEAM_PATH).then(function (t) {
      setData(null, t);
      return api;
    });
  }

  function fold(s) {
    return String(s || '').toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/[״"׳'`]/g, '').replace(/\s+/g, ' ').trim();
  }

  function teamFile() { return team; }

  function siteChecklist() {
    if (!team) return [];
    return team.siteAudit.sections.map(function (s) {
      return { id: s.id, he: s.he, items: s.items.slice() };
    });
  }

  function topRisks(n) {
    if (!team) return [];
    return team.riskMatrix.rows.slice().sort(function (a, b) {
      return b.relevance - a.relevance || b.severity - a.severity;
    }).slice(0, n || team.riskMatrix.rows.length);
  }

  function incidentFor(query) {
    if (!team) return [];
    var q = fold(query);
    return team.incidentResponses.rows.filter(function (r) {
      return !q || fold(r.type + ' ' + r.response).indexOf(q) !== -1;
    });
  }

  // Stubs so older callers that still probe the removed course booklet do not throw.
  function empty() { return []; }
  function none() { return null; }

  var api = {
    TEAM_PATH: TEAM_PATH,
    setData: setData,
    load: load,
    get data() { return null; },
    sources: empty,
    sourceById: none,
    credit: function () { return ''; },
    drills: empty,
    categories: function () { return {}; },
    games: empty,
    warmupMinutes: function () { return 5; },
    sessionList: empty,
    sessionWorkout: none,
    methodWorkout: none,
    parseClock: function (v) {
      if (typeof v === 'number') return v;
      var s = String(v == null ? '' : v).trim();
      var m = /^(\d+):(\d{2})$/.exec(s);
      return m ? Number(m[1]) * 60 + Number(m[2]) : Number(s);
    },
    scoreComponent: none,
    scoreFitnessTest: function () { return { components: [], total: 0, complete: false }; },
    teamFile: teamFile,
    siteChecklist: siteChecklist,
    topRisks: topRisks,
    incidentFor: incidentFor,
    catalogLinks: function () { return { linked: [], missing: [] }; }
  };

  root.THBooklet = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
