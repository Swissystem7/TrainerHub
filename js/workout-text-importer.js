(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./ingest.js'),
      (function () { try { return require('./infer.js'); } catch (e) { return null; } })(),
      (function () { try { return require('./core.js'); } catch (e) { return null; } })()
    );
  } else {
    var api = factory(root.THIngest, root.THInfer, root.TH);
    root.THWorkoutTextImporter = api;
    root.parseWorkoutTextToPlan = api.parseWorkoutTextToPlan;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function (Ingest, Infer, TH) {
  'use strict';

  function sanitizeWorkoutText(text) {
    return typeof text !== 'string' ? '' : text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>|javascript\s*:|[<>]/gi, ' ');
  }

  function toEntries(obj) {
    return obj ? Object.keys(obj).filter(function (k) { return k.charAt(0) !== '_'; })
      .map(function (k) { return Object.assign({ id: k }, obj[k]); }) : [];
  }

  function normalizeCatalog(cat) {
    if (Array.isArray(cat)) return cat;
    if (cat && typeof cat === 'object') return toEntries(cat);
    if (TH && TH.catalog) return toEntries(TH.catalog);
    return (Ingest && typeof Ingest.catalogEntries === 'function' && Ingest.catalogEntries()) || [];
  }

  function findAlternativeSuggestions(name, catalogList) {
    if (!catalogList || !catalogList.length || !name) return [];
    var muscles = [];
    if (Infer && typeof Infer.inferFromName === 'function') {
      try { muscles = (Infer.inferFromName(name) || {}).muscles || []; } catch (e) {}
    }
    var tokens = String(name || '').toLowerCase().split(/[\s\-–—,./_()]+/).filter(function (t) { return t.length >= 2; });
    var scored = catalogList.filter(function (it) { return it && it.he; }).map(function (it) {
      var score = 0, m = it.muscles || [], he = it.he.toLowerCase();
      muscles.forEach(function (x) { if (m.indexOf(x) !== -1) score += 5; });
      tokens.forEach(function (tok) { if (he.indexOf(tok) !== -1 || tok.indexOf(he) !== -1) score += 4; });
      if (it.driveId || it.file) score += 0.5;
      return { item: it, score: score };
    }).filter(function (s) { return s.score > 0; }).sort(function (a, b) { return b.score - a.score; });

    var top = (scored.length ? scored : catalogList.map(function (it) { return { item: it }; })).slice(0, 3)
      .map(function (s) { return { id: s.item.id, he: s.item.he, name: s.item.he, muscles: s.item.muscles || [] }; });
    return top;
  }

  function emptyPlan(dur) {
    return { title: 'אימון שנקלט', duration_minutes: dur || 30, exercises: [], recognized: [], unmatched: [], unmatchedNames: [], suggestions: [], alternatives: {}, warnings: [] };
  }

  function parseWorkoutTextToPlan(rawText, catalog) {
    if (typeof rawText !== 'string' || !rawText.trim()) return emptyPlan(30);
    var clean = sanitizeWorkoutText(rawText).trim();
    if (!clean) return emptyPlan(30);

    var catalogList = normalizeCatalog(catalog), raw = [], ingested = null;
    if (Ingest && typeof Ingest.ingestText === 'function') {
      try {
        ingested = Ingest.ingestText(clean, catalogList);
        if (ingested && Array.isArray(ingested.exercises)) raw = ingested.exercises;
      } catch (e) {}
    }
    if (!raw.length && Ingest && typeof Ingest.parseExerciseToken === 'function') {
      clean.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (line) {
        var p = Ingest.parseExerciseToken(line, {});
        if (p && !p.restOnly && p.name) {
          var hit = typeof Ingest.matchName === 'function' ? Ingest.matchName(p.name, catalogList) : null;
          p.id = hit ? hit.id : null;
          p.matchedHe = hit ? hit.he : null;
          p.missing = !hit;
          raw.push(p);
        }
      });
    }

    var plan = emptyPlan((ingested && ingested.workout && ingested.workout.duration_minutes) || 30);
    plan.title = (ingested && ingested.workout && ingested.workout.title) || 'אימון שנקלט';

    raw.forEach(function (ex) {
      var matched = !ex.missing && Boolean(ex.id), exName = ex.name || '', sugs = [];
      if (!matched) {
        sugs = findAlternativeSuggestions(exName, catalogList);
        plan.alternatives[exName] = sugs;
        plan.suggestions.push({ name: exName, suggestions: sugs });
        plan.warnings.push('התרגיל "' + exName + '" אינו מזוהה בקטלוג. הצעות חלופה: ' + sugs.map(function (s) { return s.he; }).join(', '));
      }
      var item = {
        name: exName, id: ex.id || null, matched: matched, matchedHe: ex.matchedHe || (matched ? exName : null),
        sets: ex.sets != null ? ex.sets : null, reps: ex.reps != null ? ex.reps : null,
        duration_seconds: ex.duration_seconds != null ? ex.duration_seconds : null,
        rest_seconds: ex.rest_seconds != null ? ex.rest_seconds : null, notes: ex.notes || null, suggestions: sugs
      };
      plan.exercises.push(item);
      if (matched) {
        plan.recognized.push(item);
      } else {
        plan.unmatched.push(Object.assign({}, item, {
          suggestions: sugs,
          toString: function () { return this.name; },
          valueOf: function () { return this.name; }
        }));
        plan.unmatchedNames.push(exName);
      }
    });
    return plan;
  }

  function exported(rawText, catalog) { return parseWorkoutTextToPlan(rawText, catalog); }
  exported.parseWorkoutTextToPlan = parseWorkoutTextToPlan;
  exported.sanitizeWorkoutText = sanitizeWorkoutText;
  exported.findAlternativeSuggestions = findAlternativeSuggestions;
  return exported;
});
