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

  // "הפסקה" (break) is used for rest as often as "מנוחה" in trainers' messages.
  var REST_RX = /מנוחה|הפסקה/;

  // The rest clause of one line: «מנוחה 30 שניות», «עם 60 שניות מנוחה»,
  // «מנוחה של דקה בין הסטים», «מנוחה 1:00». A line that holds nothing else is
  // a rest line; an exercise line keeps its name and takes the clause as its rest.
  var TIME_UNIT = '(?:שניות|שנייה|שניה|שנ(?:[׳\']|(?![\\u0590-\\u05FF]))|דקות|דקה|דק[׳\'])';
  var TIMED = '(?:\\d{1,2}:[0-5]\\d|\\d+\\s*' + TIME_UNIT + '(?:\\s*וחצי)?|(?:שתי\\s*דקות|דקה)\\s*וחצי|חצי\\s*דקה|שתי\\s*דקות|דקה(?:\\s+אחת)?)';
  var REST_FILLER = '(?:\\s+(?:של|פעילה|קצרה|ארוכה|בין\\s+(?:ה?סטים|ה?סבבים|ה?תרגילים|כל\\s+(?:סט|סבב|תרגיל))))*';
  var REST_AFTER_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?:מנוחה|הפסקה)' + REST_FILLER + '(?:\\s+(?:' + TIMED + '|\\d+(?![\\d:])))?' + REST_FILLER);
  var REST_BEFORE_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?' + TIMED + '\\s+(?:מנוחה|הפסקה)' + REST_FILLER);

  function splitRest(s) {
    var t = String(s || '');
    if (!REST_RX.test(t)) return { found: false, rest: null, text: t };
    var m = t.match(REST_AFTER_RX);
    var secs = m ? parseRestSeconds(m[0]) : null;
    if (secs == null) {
      var before = t.match(REST_BEFORE_RX);
      if (before) {
        m = before;
        secs = parseRestSeconds(before[0]);
      }
    }
    if (!m) return { found: false, rest: null, text: t };
    return { found: true, rest: secs, text: t.replace(m[0], ' ') };
  }

  function isRestToken(s) {
    var t = Infer.fold(s);
    if (!t || !REST_RX.test(t)) return false;
    return !/[\u0590-\u05FFa-zA-Z]/.test(splitRest(t).text);
  }

  function parseRestSeconds(s) {
    var t = Infer.fold(s);
    if (!REST_RX.test(t)) return null;
    var clock = t.match(/(\d{1,2}):([0-5]\d)/);
    if (clock) return toInt(clock[1]) * 60 + toInt(clock[2]);
    if (/דקה\s*וחצי/.test(t)) return 90;
    if (/חצי\s*דקה/.test(t)) return 30;
    if (/שתי\s*דקות/.test(t)) return 120;
    var m = t.match(/(\d+)\s*דקות?/);
    if (m) return toInt(m[1]) * 60;
    if (/דקה/.test(t)) return 60;
    m = t.match(/(\d+)\s*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/);
    if (m) return toInt(m[1]);
    m = t.match(/(?:מנוחה|הפסקה)\s+(\d+)/);
    if (m) return toInt(m[1]);
    return null;
  }

  function scanDefaults(text) {
    var raw = String(text || '');
    var defaults = { sets: null, rest: null, workSeconds: null };
    var rounds = raw.match(/(\d+)\s*סבבים?/);
    if (rounds) defaults.sets = toInt(rounds[1]);
    // "שנ" alone is seconds, but not the start of a word like "שני" (e.g. "12 שני הצדדים").
    // [ \t] keeps a rest/work keyword on its own line from borrowing the next line's number.
    var rest = raw.match(/(?:מנוחה|הפסקה)[ \t]+(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/) ||
      raw.match(/(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))[ \t]*(?:מנוחה|הפסקה)/);
    if (rest) defaults.rest = toInt(rest[1]);
    if (/דקה (?:מנוחה|הפסקה)|(?:מנוחה|הפסקה) דקה/.test(raw) && defaults.rest == null) defaults.rest = 60;
    if (/שתי דקות מנוחה|מנוחה שתי דקות|2 דקות מנוחה|מנוחה 2 דקות/.test(raw) && defaults.rest == null) {
      defaults.rest = 120;
    }
    var work = raw.match(/(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))[ \t]*עבודה/) ||
      raw.match(/עבודה[ \t]+(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/);
    if (work) defaults.workSeconds = toInt(work[1]);
    return defaults;
  }

  function splitTokens(text) {
    var raw = String(text || '').trim();
    if (!raw) return [];
    var body = raw;
    var after = raw.match(/סבבים?\s*[:\-–]\s*([\s\S]+)/);
    if (after) {
      body = after[1];
    } else {
      after = raw.match(/(?:^|\n)\s*\d+\s*סבבים?\s*(?:\n+|[,،]\s*)([\s\S]+)/);
      if (after) {
        body = after[1];
      } else {
        var colon = raw.indexOf(':');
        if (colon > 0 && colon < 80) {
          var left = raw.slice(0, colon).trim();
          var right = raw.slice(colon + 1).trim();
          if (right && (/^[^\d\n]{2,40}$/.test(left) || /עבודה|מנוחה|שניות|שנ/.test(left))) {
            body = right;
          }
        }
      }
    }
    return body
      .split(/\n+|[,،]|\s+ו(?!חצי|רבע)(?=\d|\s*[\u0590-\u05FF])/)
      .map(function (s) { return s.replace(/^[•\-*]\s*/, '').replace(/[.:]+$/, '').trim(); })
      .filter(function (s) {
        if (s.length <= 1) return false;
        if (/^\d+\s*סבבים?$/.test(s)) return false;
        return true;
      });
  }

  // Work time written in words: "שתי דקות ריצה במקום", "פלאנק שלוש דקות".
  var MINUTE_WORDS = { 'שתי': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10 };
  var MINUTE_WORDS_RE = /(^|\s)(שתי|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s+דקות(?=\s|$)/;

  function parseExerciseToken(token, defaults) {
    defaults = defaults || {};
    var s = String(token || '').trim();
    if (!s) return null;
    if (isRestToken(s)) {
      return { restOnly: true, rest_seconds: parseRestSeconds(s) || defaults.rest || 60 };
    }
    // List numbering: "1. סקוואט 15", "2) שכיבות", "תרגיל 3: פלאנק" (not "3.5 דקות", not "1:30").
    s = s.replace(/^(?:תרגיל\s*\d{1,2}\s*[.)\]:\-–]?\s*|\d{1,2}\s*[.)\]](?:\s+|(?=[\u0590-\u05FFa-zA-Z]))|\d{1,2}\s*:\s*(?=[\u0590-\u05FFa-zA-Z]))/, '').trim();
    if (!s) return null;
    var sets = defaults.sets != null ? defaults.sets : null;
    var setsExplicit = false;
    var reps = null;
    var duration_seconds = defaults.workSeconds != null ? defaults.workSeconds : null;
    var rest_seconds = defaults.rest != null ? defaults.rest : null;

    // "לאנג׳ 10 חזרות מנוחה 30 שניות": the rest belongs to this exercise, the line is not a rest line.
    var restClause = splitRest(s);
    if (restClause.found) {
      s = restClause.text;
      if (restClause.rest != null) rest_seconds = restClause.rest;
    }

    // Clock time "1:30" / "3x0:40" and seconds marked with " or ״ ("30"", "45״").
    var m = s.match(/(?:(\d+)\s*[x×]\s*)?(\d{1,2}):([0-5]\d)/i);
    if (m) {
      if (m[1]) sets = toInt(m[1]);
      duration_seconds = toInt(m[2]) * 60 + toInt(m[3]);
      s = s.replace(m[0], ' ');
    } else if ((m = s.match(/(\d+)\s*["״]/))) {
      duration_seconds = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // "3 סטים של 12 חזרות", "10 חזרות 3 סבבים"; the count after the sets is reps
    // only when no time unit follows it ("3 סטים 15 שניות" is timed work).
    m = s.match(/(\d+)\s*(?:סטים?|סבבים?)\s*(?:של\s*)?(?:(\d+)(?![\d:]|\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|דק|["״′″]))(?:\s*חזרות)?)?/);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[2]) reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    // "3x12", "3 x 15 חזרות", "3x45 שניות" (sets × seconds).
    m = s.match(/(\d+)\s*[x×]\s*(\d+)(?![\d:])\s*(חזרות|שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|["״′″])?/i);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[3] && m[3] !== 'חזרות') duration_seconds = toInt(m[2]);
      else reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*חזרות/);
    if (m) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // A bare multiplier is the sets: "פלאנק 45 שניות x3", "x3 12 חזרות",
    // "3 סטים x 12" (reps), "סקוואט 15 x 3 סטים" (the x dangles once the sets are taken).
    m = s.match(/(?:^|\s)[x×]\s*(\d+)(?![\d:]|\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|דק|חזרות|["״′″]))/i);
    if (m) {
      if (!setsExplicit) {
        sets = toInt(m[1]);
        setsExplicit = true;
      } else if (reps == null) {
        reps = toInt(m[1]);
      }
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*[x×](?=\s|$)/i);
    if (m) {
      if (!setsExplicit) {
        sets = toInt(m[1]);
        setsExplicit = true;
      } else if (reps == null && duration_seconds == null) {
        reps = toInt(m[1]);
      }
      s = s.replace(m[0], ' ');
    }
    var minMatch = null;
    var minSec = null;
    m = s.match(/(?:(\d+)\s*דקות|שתי\s*דקות|דקה)\s*(?:וחצי|ו-?(?:1\/2|½))/);
    if (m) {
      if (m[1]) minSec = toInt(m[1]) * 60 + 30;
      else if (/שתי/.test(m[0])) minSec = 150;
      else minSec = 90;
      minMatch = m[0];
    } else if ((m = s.match(/(?:1\/2|½|חצי)\s*דקה/))) {
      minSec = 30;
      minMatch = m[0];
    } else if ((m = s.match(/שתי\s*דקות/))) {
      minSec = 120;
      minMatch = m[0];
    } else if ((m = s.match(/(\d+(?:\.\d+)?)\s*(?:דקות|דקה|דק[׳']|′)/))) {
      minSec = Math.round(parseFloat(m[1]) * 60);
      minMatch = m[0];
    } else if ((m = s.match(/(^|\s)דקתיים(?=\s|$)/))) {
      minSec = 120;
      minMatch = m[0];
    } else if ((m = s.match(MINUTE_WORDS_RE))) {
      minSec = MINUTE_WORDS[m[2]] * 60;
      minMatch = m[0];
    } else if ((m = s.match(/(?:^|[\s\-–—,.:])(דקה(?:\s*אחת)?)(?:[\s\-–—,.:]|$)/))) {
      minSec = 60;
      minMatch = m[0];
    }
    if (minMatch) {
      duration_seconds = minSec;
      s = s.replace(minMatch, ' ');
    }
    m = s.match(/(\d+)\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|″)/);
    if (m) {
      var sec = toInt(m[1]);
      duration_seconds = minSec != null ? minSec + sec : sec;
      s = s.replace(m[0], ' ');
    } else {
      m = s.match(/(\d+)\s*(?:דקות|דקה|דק[׳'])/);
      if (m) {
        duration_seconds = toInt(m[1]) * 60;
        s = s.replace(m[0], ' ');
      } else if ((m = s.match(/דקה וחצי/))) {
        duration_seconds = 90;
        s = s.replace(m[0], ' ');
      } else if ((m = s.match(/חצי דקה/))) {
        duration_seconds = 30;
        s = s.replace(m[0], ' ');
      } else if ((m = s.match(/(^|\s)דקה(?=\s|$)/))) {
        duration_seconds = 60;
        s = s.replace(m[0], ' ');
      }
    }
    s = s.trim();
    m = s.match(/^(\d+)\s+/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // A count after the name: "שכיבות סמיכה 15".
    m = s.match(/\s(\d+)\s*$/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    var name = s.replace(/[\-–—,.:×xX]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) {
      // "מתח 5 חזרות, 4 סטים": the comma split the sets off; hand them to the exercise before.
      if (setsExplicit || (restClause.found && restClause.rest != null)) {
        return { continuation: true, sets: setsExplicit ? sets : null, rest_seconds: restClause.found ? restClause.rest : null };
      }
      return null;
    }
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
      notes: null,
      restOnly: undefined
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

  function wishlistRemove(name) {
    var api = th();
    if (!api) return [];
    var key = Infer.normalizeSynonym(name);
    var list = wishlistList().filter(function (item) {
      return !item || Infer.normalizeSynonym(item.he) !== key;
    });
    api.store.set(api.KEYS.wishlist, list);
    return list;
  }

  // A wish is "film this exercise". Once a clip that matches the name exists
  // (the trainer added it in manage.html, or it arrived in the catalog), the
  // wish is done: drop it, using the same matcher that failed when the wish
  // was written, so the list only shows names a paste would still miss.
  function wishlistPrune(catalogOrList) {
    var api = th();
    if (!api) return [];
    var list = Array.isArray(catalogOrList) ? catalogOrList : catalogEntries();
    var before = wishlistList();
    var kept = before.filter(function (item) {
      return item && item.he && !matchName(item.he, list);
    });
    if (kept.length !== before.length) api.store.set(api.KEYS.wishlist, kept);
    return kept;
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
      if (parsed.continuation) {
        var prev = exercises[exercises.length - 1];
        if (parsed.sets != null) {
          if (prev) prev.sets = parsed.sets;
          else defaults.sets = parsed.sets;
        }
        if (parsed.rest_seconds != null) {
          lastRest = parsed.rest_seconds;
          if (prev) prev.rest_seconds = lastRest;
        }
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
    // Re-saving the same slice (same video, same start and end) updates it.
    // Any other slice gets an id no catalog or user entry already holds, so a
    // second "פלאנק" segment becomes seg_פלאנק_2 instead of replacing the first.
    var start = Math.floor(startSec);
    var end = Math.floor(endSec);
    var users = typeof api.userCatalogList === 'function' ? api.userCatalogList() : [];
    var same = users.filter(function (e) {
      return e && e.driveId === driveId && e.startSec != null &&
        Number(e.startSec) === start && Number(e.endSec) === end;
    })[0];
    var used = {};
    Object.keys(api.catalog || {}).forEach(function (k) { used[k] = true; });
    users.forEach(function (e) { if (e && e.id) used[e.id] = true; });
    var entry = {
      id: same ? same.id : Infer.makeId('seg', he, used),
      he: he,
      muscles: inferred.muscles,
      equipment: inferred.equipment,
      level: inferred.level,
      source: 'drive',
      folder: opts.folder || '',
      driveId: driveId,
      startSec: start,
      endSec: end,
      segmentOf: opts.segmentOf || driveId
    };
    if (!api.addUserEntry(entry)) {
      return { error: 'storage', message: 'המקטע לא נשמר: הדפדפן חוסם שמירה מקומית (למשל גלישה פרטית).' };
    }
    return { entry: entry };
  }

  var api = {
    ingestText: ingestText,
    parseExerciseToken: parseExerciseToken,
    scanDefaults: scanDefaults,
    matchName: matchName,
    wishlistList: wishlistList,
    wishlistAdd: wishlistAdd,
    wishlistRemove: wishlistRemove,
    wishlistPrune: wishlistPrune,
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
