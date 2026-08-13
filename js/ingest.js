/**
 * Ingest a pasted Hebrew workout: parse sets/reps/rest, match catalog
 * clips (synonyms + common misspellings), flag unmatched for filming.
 * Also user-assisted clip segmentation. No vision model.
 * Classic script. Namespace: window.THIngest
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  var Analyzer = root.THAnalyzer;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
    try { Analyzer = require('./analyzer.js'); } catch (e) { Analyzer = null; }
  }

  function th() { return root.TH || (typeof module === 'object' ? require('./core.js') : null); }

  function toInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function isRestToken(s) {
    var t = Infer.fold(s);
    if (!t) return false;
    if (/^מנוחה$/.test(t)) return true;
    if (/מנוחה/.test(t) && !/פלאנק|שכיב|מטפס|סקוואט|מתח|בטן/.test(t)) return true;
    return false;
  }

  function parseRestSeconds(s) {
    var t = Infer.fold(s);
    if (/דקה/.test(t) && /מנוחה/.test(t)) return 60;
    if (/שתי דקות|2 דקות/.test(t) && /מנוחה/.test(t)) return 120;
    var m = t.match(/(\d+)\s*(?:שניות|שנ)/);
    if (m && /מנוחה/.test(t)) return toInt(m[1]);
    m = t.match(/מנוחה\s+(\d+)/);
    if (m) return toInt(m[1]);
    return null;
  }

  function scanDefaults(text) {
    var raw = String(text || '');
    var defaults = { sets: null, rest: null, workSeconds: null };
    var rounds = raw.match(/(\d+)\s*סבבים?/);
    if (rounds) defaults.sets = toInt(rounds[1]);
    var rest = raw.match(/מנוחה\s+(\d+)\s*(?:שניות|שנ)/) || raw.match(/(\d+)\s*שניות מנוחה/);
    if (rest) defaults.rest = toInt(rest[1]);
    if (/דקה מנוחה/.test(raw) && defaults.rest == null) defaults.rest = 60;
    var work = raw.match(/(\d+)\s*שניות עבודה/);
    if (work) defaults.workSeconds = toInt(work[1]);
    return defaults;
  }

  function splitTokens(text) {
    var raw = String(text || '').trim();
    if (!raw) return [];
    var body = raw;
    var after = raw.match(/סבבים?\s*[:\-–]\s*([\s\S]+)/);
    if (after) body = after[1];
    return body
      .split(/\n+|[,،]|\s+ו(?=\d|\s*[\u0590-\u05FF])/)
      .map(function (s) { return s.replace(/^[•\-*]\s*/, '').replace(/[.:]+$/, '').trim(); })
      .filter(function (s) { return s.length > 1; });
  }

  function parseExerciseToken(token, defaults) {
    defaults = defaults || {};
    var s = String(token || '').trim();
    if (!s) return null;
    if (isRestToken(s)) {
      return { restOnly: true, rest_seconds: parseRestSeconds(s) || defaults.rest || 60 };
    }
    var sets = defaults.sets != null ? defaults.sets : null;
    var reps = null;
    var duration_seconds = defaults.workSeconds != null ? defaults.workSeconds : null;
    var rest_seconds = defaults.rest != null ? defaults.rest : null;

    var m = s.match(/(\d+)\s*סטים?\s*(?:של\s*)?(\d+)?(?:\s*חזרות)?/);
    if (m) {
      sets = toInt(m[1]);
      if (m[2]) reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (m) {
      sets = toInt(m[1]);
      reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*חזרות/);
    if (m) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*(?:שניות|שנ[׳']|″)/);
    if (m) {
      duration_seconds = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/^(\d+)\s+/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    var name = s.replace(/[\-–—,.:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) return null;
    if (/^\d+$/.test(name)) return null;
    if (sets == null) sets = defaults.sets != null ? defaults.sets : 1;
    if (reps == null && duration_seconds == null) {
      duration_seconds = defaults.workSeconds || null;
      if (duration_seconds == null) reps = 10;
    }
    return {
      name: name,
      sets: sets,
      reps: reps,
      duration_seconds: duration_seconds,
      rest_seconds: rest_seconds,
      notes: null
    };
  }

  function tokenOverlap(a, b) {
    var ta = Infer.normalizeSynonym(a).split(' ').filter(function (w) { return w.length >= 2; });
    var tb = Infer.normalizeSynonym(b).split(' ').filter(function (w) { return w.length >= 2; });
    if (!ta.length || !tb.length) return 0;
    var hit = 0;
    ta.forEach(function (w) {
      if (tb.indexOf(w) !== -1) hit++;
    });
    return hit / Math.max(ta.length, tb.length);
  }

  function matchName(name, list) {
    if (!name) return null;
    var api = th();
    if (api && typeof api.matchCatalog === 'function' && api.catalog && Object.keys(api.catalog).length) {
      var hit = api.matchCatalog(name);
      if (hit) return hit;
    }
    var n = Infer.normalizeSynonym(name);
    var best = null;
    var bestScore = 0;
    (list || []).forEach(function (e) {
      if (!e || !e.he) return;
      var he = Infer.normalizeSynonym(e.he);
      var score = 0;
      if (he === n) score = 10;
      else if (he.length >= 3 && (n.indexOf(he) !== -1 || he.indexOf(n) !== -1)) score = 6 + Math.min(he.length, n.length) / 10;
      else score = tokenOverlap(name, e.he) * 5;
      if (e.driveId) score += 0.2;
      if (score > bestScore && score >= 4) {
        best = e;
        bestScore = score;
      }
    });
    return best;
  }

  function catalogEntries() {
    var api = th();
    if (api && typeof api.catalogList === 'function') return api.catalogList();
    return [];
  }

  function wishlistList() {
    var api = th();
    if (!api) return [];
    var list = api.store.get(api.KEYS.wishlist, []);
    return Array.isArray(list) ? list : [];
  }

  function wishlistAdd(name, reason) {
    var api = th();
    if (!api || !name) return wishlistList();
    var list = wishlistList();
    var key = Infer.normalizeSynonym(name);
    for (var i = 0; i < list.length; i++) {
      if (Infer.normalizeSynonym(list[i].he) === key) return list;
    }
    list.push({
      he: name,
      reason: reason || 'חסר סרטון במאגר',
      at: new Date().toISOString()
    });
    api.store.set(api.KEYS.wishlist, list);
    return list;
  }

  function learnFromWorkout(workout) {
    var api = th();
    if (!api || !workout) return;
    var ids = [];
    (workout.phases || []).forEach(function (ph) {
      (ph.exercises || []).forEach(function (ex) {
        if (ex && ex.id) ids.push(ex.id);
      });
    });
    if (ids.length < 2) return;
    var store = api.store.get(api.KEYS.patterns, { follows: {}, n: 0 });
    if (!store || typeof store !== 'object') store = { follows: {}, n: 0 };
    if (!store.follows) store.follows = {};
    for (var i = 0; i < ids.length - 1; i++) {
      var key = ids[i] + '>' + ids[i + 1];
      store.follows[key] = (store.follows[key] || 0) + 1;
    }
    store.n = (store.n || 0) + 1;
    api.store.set(api.KEYS.patterns, store);
  }

  function patternScore(prevId, nextId) {
    var api = th();
    if (!api || !prevId || !nextId) return 0;
    var store = api.store.get(api.KEYS.patterns, { follows: {} });
    if (!store || !store.follows) return 0;
    return store.follows[prevId + '>' + nextId] || 0;
  }

  function ingestText(text, catalogOrList) {
    var raw = String(text || '').trim();
    var defaults = scanDefaults(raw);
    var tokens = splitTokens(raw);
    var list = Array.isArray(catalogOrList)
      ? catalogOrList
      : (catalogOrList && typeof catalogOrList === 'object'
        ? Object.keys(catalogOrList).filter(function (k) { return k.charAt(0) !== '_'; })
          .map(function (id) { return Object.assign({ id: id }, catalogOrList[id]); })
        : catalogEntries());

    var exercises = [];
    var unmatched = [];
    var lastRest = defaults.rest;
    for (var i = 0; i < tokens.length; i++) {
      var parsed = parseExerciseToken(tokens[i], defaults);
      if (!parsed) continue;
      if (parsed.restOnly) {
        lastRest = parsed.rest_seconds;
        if (exercises.length) exercises[exercises.length - 1].rest_seconds = lastRest;
        continue;
      }
      if (lastRest != null && parsed.rest_seconds == null) parsed.rest_seconds = lastRest;
      var hit = matchName(parsed.name, list);
      if (hit) {
        parsed.id = hit.id;
        parsed.matchedHe = hit.he;
        parsed.missing = false;
        parsed.source = hit.source || (hit.driveId ? 'drive' : hit.file ? 'local' : '');
      } else {
        parsed.missing = true;
        parsed.id = null;
        unmatched.push(parsed.name);
        wishlistAdd(parsed.name, 'נקלט מאימון מודבק בלי סרטון במאגר');
      }
      exercises.push(parsed);
    }

    var workout = {
      title: 'אימון שנקלט',
      duration_minutes: null,
      participants: 1,
      equipment: [],
      intensity: 'medium',
      tags: ['ingest'],
      phases: [
        { name: 'Warm-up', duration_minutes: 0, exercises: [] },
        { name: 'Main', duration_minutes: null, exercises: exercises.map(function (ex) {
          return {
            name: ex.name,
            id: ex.id,
            sets: ex.sets,
            reps: ex.reps,
            duration_seconds: ex.duration_seconds,
            rest_seconds: ex.rest_seconds,
            notes: ex.missing ? 'חסר סרטון' : null,
            missing: ex.missing || false
          };
        }) },
        { name: 'Cool-down', duration_minutes: 0, exercises: [] }
      ],
      source: 'ingest'
    };

    if (Analyzer && typeof Analyzer.analyzeSession === 'function') {
      workout.analysis = Analyzer.analyzeSession(workout);
    }
    learnFromWorkout(workout);
    return {
      workout: workout,
      exercises: exercises,
      unmatched: unmatched,
      wishlist: wishlistList(),
      defaults: defaults
    };
  }

  function saveSegment(opts) {
    opts = opts || {};
    var api = th();
    var driveId = opts.driveId || (opts.url && Infer.parseDriveId(opts.url));
    var he = String(opts.he || opts.name || '').trim();
    var startSec = Number(opts.startSec);
    var endSec = Number(opts.endSec);
    if (!api) return { error: 'no-core', message: 'ליבת המאגר לא טעונה.' };
    if (Infer.isBlockedName(he)) {
      return { error: 'blocked', message: 'השם חסום — קליפים אנונימיים או שמות אישיים לא נכנסים למאגר.' };
    }
    if (!driveId) return { error: 'need-drive', message: 'צריך מזהה דרייב של הסרטון הארוך.' };
    if (!he) return { error: 'need-name', message: 'צריך שם תרגיל בעברית למקטע.' };
    if (!isFinite(startSec) || !isFinite(endSec) || endSec <= startSec) {
      return { error: 'bad-range', message: 'סמנו התחלה וסוף — זמן הסיום חייב להיות אחרי ההתחלה.' };
    }
    var inferred = Infer.inferFromName(he, { folder: opts.folder || '' });
    var entry = {
      id: Infer.makeId('seg', he, {}),
      he: he,
      muscles: inferred.muscles,
      equipment: inferred.equipment,
      level: inferred.level,
      source: 'drive',
      folder: opts.folder || '',
      driveId: driveId,
      startSec: Math.floor(startSec),
      endSec: Math.floor(endSec),
      segmentOf: opts.segmentOf || driveId
    };
    api.addUserEntry(entry);
    return { entry: entry };
  }

  var api = {
    ingestText: ingestText,
    parseExerciseToken: parseExerciseToken,
    scanDefaults: scanDefaults,
    matchName: matchName,
    wishlistList: wishlistList,
    wishlistAdd: wishlistAdd,
    learnFromWorkout: learnFromWorkout,
    patternScore: patternScore,
    saveSegment: saveSegment,
    isRestToken: isRestToken
  };

  root.THIngest = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
