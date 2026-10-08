/**
 * TrainerHub — coach-course booklet content (Acharai association, Sept 2026).
 * Classic script, no bundler. Namespace: window.THBooklet.
 * Data lives in content/booklet/*.json; this file only reads it and turns it
 * into the shapes the rest of the app already uses (phases workouts, catalog ids).
 * Nothing here stores personal data: the fitness-test calculator and the
 * team-file roster are computed/printed in the page and never saved.
 */
(function (root) {
  'use strict';

  var MAIN_PATH = 'content/booklet/acharai-coach-course.json';
  var TEAM_PATH = 'content/booklet/team-safety-file.json';
  var data = null;
  var team = null;

  function setData(main, teamFile) {
    data = main || null;
    team = teamFile || null;
    return api;
  }

  function need() {
    if (!data) throw new Error('booklet data not loaded');
    return data;
  }

  function loadJson(rel) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var url = root.TH && typeof root.TH.assetUrl === 'function' ? root.TH.assetUrl(rel) : rel;
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function load() {
    if (data) return Promise.resolve(api);
    return Promise.all([loadJson(MAIN_PATH), loadJson(TEAM_PATH)]).then(function (pair) {
      setData(pair[0], pair[1]);
      return api;
    });
  }

  // ---------- sources / credit ----------
  function sources() { return need()._meta.sources.slice(); }

  function sourceById(id) {
    var list = need()._meta.sources;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function credit(id) {
    var s = sourceById(id);
    if (!s) return '';
    return 'מקור: ' + s.title + ' — ' + need()._meta.organization;
  }

  // ---------- drills ----------
  function fold(s) {
    return String(s || '').toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/[״"׳'`]/g, '').replace(/\s+/g, ' ').trim();
  }

  function drills(filter) {
    filter = filter || {};
    var q = fold(filter.q);
    return need().drills.filter(function (d) {
      if (filter.category && d.category !== filter.category) return false;
      if (filter.source && d.source !== filter.source) return false;
      if (filter.muscle && (d.muscles || []).indexOf(filter.muscle) === -1) return false;
      if (filter.partner != null && !!d.partner !== !!filter.partner) return false;
      if (filter.prepFriendly && !d.prepFriendly) return false;
      if (q && fold(d.he + ' ' + (d.notes || '')).indexOf(q) === -1) return false;
      return true;
    });
  }

  function categories() {
    var seen = {};
    need().drills.forEach(function (d) { seen[d.category] = (seen[d.category] || 0) + 1; });
    return seen;
  }

  function games(kind) {
    return need().games.filter(function (g) { return !kind || g.kind === kind; });
  }

  // ---------- warm-up rules ----------
  /** Minutes of warm-up (without stretching) per the prep booklet.
   *  season: 'summer' | 'winter'; activity: 'long' (continuous) | 'short' (short & intense).
   *  When both apply, the longer requirement wins. */
  function warmupMinutes(opts) {
    opts = opts || {};
    var d = need().principles.warmup.durations;
    var by = {};
    d.forEach(function (x) { by[x.id] = x.minutes; });
    var season = opts.season === 'winter' ? by.winter : by.summer;
    var act = opts.activity === 'short' ? by.short : by.long;
    return Math.max(season, act);
  }

  // ---------- workouts ----------
  function exerciseFrom(src, defaults) {
    defaults = defaults || {};
    var reps = src.reps != null ? src.reps : (defaults.reps != null ? defaults.reps : null);
    var secs = src.seconds != null ? src.seconds : (src.holdSeconds != null ? src.holdSeconds : (defaults.seconds != null ? defaults.seconds : null));
    return {
      name: src.he,
      id: src.catalogId || src.id || src.he,
      sets: src.repeats != null ? src.repeats : (defaults.sets != null ? defaults.sets : 1),
      reps: reps,
      duration_seconds: reps != null ? null : secs,
      rest_seconds: defaults.rest != null ? defaults.rest : null,
      notes: src.notes || defaults.notes || null
    };
  }

  function pick(list, n) {
    if (list.length <= n) return list.slice();
    var out = [];
    var step = list.length / n;
    for (var i = 0; i < n; i++) out.push(list[Math.floor(i * step)]);
    return out;
  }

  function warmupPhase(opts) {
    var minutes = warmupMinutes(opts);
    var bank = drills({ category: 'warmup' });
    var n = Math.max(3, Math.min(bank.length, minutes));
    var chosen = pick(bank, n);
    var each = Math.round((minutes * 60) / chosen.length);
    return {
      name: 'Warm-up',
      duration_minutes: minutes,
      exercises: chosen.map(function (d) { return exerciseFrom(d, { seconds: each, sets: 1 }); })
    };
  }

  function cooldownPhase(minutes) {
    var proto = need().principles.flexibilityProtocol;
    minutes = minutes || proto.minutes.closing;
    var bank = drills({ category: 'flexibility' });
    // 15 s × 3 repeats (× 2 sides when per-side) ≈ 45–90 s per stretch.
    var perStretch = 75;
    var n = Math.max(3, Math.min(bank.length, Math.round((minutes * 60) / perStretch)));
    return {
      name: 'Cool-down',
      duration_minutes: minutes,
      exercises: pick(bank, n).map(function (d) {
        return exerciseFrom(d, { seconds: d.holdSeconds || 15, sets: d.repeats || 3, notes: d.timing });
      })
    };
  }

  function workoutShell(title, tags, phases, equipment) {
    var total = phases.reduce(function (a, p) { return a + (Number(p.duration_minutes) || 0); }, 0);
    return {
      title: title,
      duration_minutes: total,
      participants: 1,
      equipment: equipment || ['none'],
      intensity: 'medium',
      tags: ['booklet'].concat(tags || []),
      source: 'acharai-coach-course',
      phases: phases
    };
  }

  function partExercises(part) {
    var rounds = Array.isArray(part.rounds) ? part.rounds[0] : (part.rounds || 1);
    if (Array.isArray(part.exercises) && part.exercises.length) {
      return part.exercises.map(function (x) {
        return exerciseFrom(x, {
          sets: rounds,
          seconds: part.workSeconds != null ? part.workSeconds : null,
          rest: part.restSeconds != null ? part.restSeconds : null,
          notes: part.he
        });
      });
    }
    // Text-only drills (relay, flag game, crawling) stay as one timed card.
    return [{
      name: part.he,
      id: null,
      sets: 1,
      reps: null,
      duration_seconds: part.minutes ? part.minutes * 60 : null,
      rest_seconds: null,
      notes: part.text || null
    }];
  }

  function sessionList() {
    return need().sessions.map(function (s) { return { id: s.id, he: s.he, equipment: s.equipment }; });
  }

  function findSession(id) {
    var list = need().sessions;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** Opening session from the bank → phases workout (warm-up, main 45', closing stretches). */
  function sessionWorkout(id, opts) {
    opts = opts || {};
    var s = findSession(id);
    if (!s) return null;
    var tmpl = need().sessionTemplate;
    var mainPart = tmpl.parts.filter(function (p) { return p.phase === 'Main'; })[0];
    var main = [];
    s.parts.forEach(function (p) { main = main.concat(partExercises(p)); });
    return workoutShell(s.he, ['opening', s.id], [
      warmupPhase(opts),
      { name: 'Main', duration_minutes: mainPart ? mainPart.minutes : 45, exercises: main },
      cooldownPhase(opts.cooldownMinutes)
    ], s.equipment);
  }

  function findMethod(id) {
    var list = need().methods;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** Limited-space method (IGO-UGO, Tabata, combined, pyramid) → phases workout. */
  function methodWorkout(id, exampleIndex, opts) {
    opts = opts || {};
    var m = findMethod(id);
    if (!m) return null;
    var ex = (m.examples || [])[exampleIndex || 0] || null;
    var main = [];
    var minutes = 20;
    if (m.id === 'tabata') {
      var combined = findMethod('combined').examples[0].exercises;
      main = combined.slice(0, m.exercisesPerSet).map(function (x) {
        return exerciseFrom(x, { sets: m.sets, seconds: m.workSeconds, rest: m.restSeconds, notes: 'טבטה: 20 שנ׳ עבודה / 10 שנ׳ מנוחה' });
      });
      minutes = m.sets * 4 + (m.sets - 1) * 2;
    } else if (m.id === 'combined' && ex) {
      main = ex.exercises.map(function (x) { return exerciseFrom(x, { sets: 1, seconds: m.workSeconds, rest: m.restSeconds }); });
      minutes = Math.round((ex.exercises.length * (m.workSeconds + m.restSeconds)) / 60);
    } else if (m.id === 'igo-ugo' && ex) {
      ex.blocks.forEach(function (b) {
        b.exercises.forEach(function (x) { main.push(exerciseFrom(x, { sets: 1, notes: b.he + ' · IGO-UGO בזוגות' })); });
      });
      minutes = 25;
    } else if (m.id === 'pyramid' && ex) {
      if (ex.ladder) {
        main = ex.exercises.map(function (x) {
          return exerciseFrom(x, { sets: ex.ladder.length, reps: ex.ladder.join('-'), notes: ex.text });
        });
      } else {
        main = ex.exercises.map(function (x) { return exerciseFrom(x, { sets: 1 }); });
      }
      minutes = 25;
    } else {
      main = [{ name: m.he, id: null, sets: 1, reps: null, duration_seconds: null, rest_seconds: null, notes: m.text }];
    }
    return workoutShell(m.he + (ex && ex.he ? ' — ' + ex.he : ''), ['limited-space', m.id], [
      warmupPhase(opts),
      { name: 'Main', duration_minutes: minutes, exercises: main },
      cooldownPhase(opts.cooldownMinutes)
    ]);
  }

  // ---------- fitness test ----------
  function parseClock(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).trim().replace(/[׳'"″]+$/, '');
    if (!s) return NaN;
    if (s.indexOf(':') !== -1) {
      // m:ss or a stopwatch's h:mm:ss. Every part after the first must be 0-59.
      var p = s.split(':');
      if (p.length > 3) return NaN;
      var total = 0;
      for (var i = 0; i < p.length; i++) {
        var n = p[i].trim() === '' ? NaN : Number(p[i]);
        if (!isFinite(n) || n < 0 || (i > 0 && n >= 60)) return NaN;
        total = total * 60 + n;
      }
      return total;
    }
    return Number(s);
  }

  function component(id) {
    var list = need().fitnessTest.components;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** Score one component. Reps/hold tables: highest row reached. Run tables: first row whose maxSeconds ≥ time. */
  function scoreComponent(id, value, sex) {
    var c = component(id);
    if (!c) return null;
    var floor = need().fitnessTest.floorScore;
    var v = c.unit === 'seconds' ? parseClock(value) : Number(value);
    if (!isFinite(v) || v < 0) return null;
    var i;
    if (c.higherIsBetter) {
      var key = c.unit === 'reps' ? 'minReps' : 'minSeconds';
      for (i = 0; i < c.table.length; i++) if (v >= c.table[i][key]) return c.table[i].score;
      return v > 0 ? floor : 0;
    }
    var table = c.tables[sex === 'female' ? 'female' : 'male'];
    if (!table) return null;
    // A run time of zero is an empty stopwatch, not the best score.
    if (v === 0) return null;
    for (i = 0; i < table.length; i++) if (v <= table[i].maxSeconds) return table[i].score;
    return floor;
  }

  /** results: { pullups, pushups, plank, run300, run3k } — times as "m:ss" or seconds. */
  function scoreFitnessTest(results, sex) {
    results = results || {};
    var comps = need().fitnessTest.components;
    var rows = [];
    var total = 0;
    var complete = true;
    comps.forEach(function (c) {
      var raw = results[c.id];
      var score = raw === '' || raw == null ? null : scoreComponent(c.id, raw, sex);
      if (score == null) complete = false;
      var weighted = score == null ? 0 : (score * c.weight) / 100;
      total += weighted;
      rows.push({ id: c.id, he: c.he, weight: c.weight, value: raw == null ? null : raw, score: score, weighted: Math.round(weighted * 10) / 10 });
    });
    return { components: rows, total: Math.round(total * 10) / 10, complete: complete };
  }

  // ---------- team safety file ----------
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

  // ---------- link to the video catalog ----------
  function catalogLinks(catalog) {
    catalog = catalog || (root.TH && root.TH.catalog) || {};
    var linked = [];
    var missing = [];
    function check(he, id) {
      if (!id) return;
      if (catalog[id]) linked.push({ he: he, id: id });
      else missing.push({ he: he, id: id });
    }
    var d = need();
    d.drills.forEach(function (x) { check(x.he, x.catalogId); });
    d.methods.forEach(function (m) {
      (m.examples || []).forEach(function (e) {
        (e.exercises || []).forEach(function (x) { check(x.he, x.catalogId); });
        (e.blocks || []).forEach(function (b) { b.exercises.forEach(function (x) { check(x.he, x.catalogId); }); });
      });
    });
    d.sessions.forEach(function (s) {
      s.parts.forEach(function (p) { (p.exercises || []).forEach(function (x) { check(x.he, x.catalogId); }); });
    });
    return { linked: linked, missing: missing };
  }

  var api = {
    MAIN_PATH: MAIN_PATH,
    TEAM_PATH: TEAM_PATH,
    setData: setData,
    load: load,
    get data() { return data; },
    sources: sources,
    sourceById: sourceById,
    credit: credit,
    drills: drills,
    categories: categories,
    games: games,
    warmupMinutes: warmupMinutes,
    sessionList: sessionList,
    sessionWorkout: sessionWorkout,
    methodWorkout: methodWorkout,
    parseClock: parseClock,
    scoreComponent: scoreComponent,
    scoreFitnessTest: scoreFitnessTest,
    teamFile: teamFile,
    siteChecklist: siteChecklist,
    topRisks: topRisks,
    incidentFor: incidentFor,
    catalogLinks: catalogLinks
  };

  root.THBooklet = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
