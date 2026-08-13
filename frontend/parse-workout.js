/**
 * Rule-based free-text workout parser (no AI).
 * Produces the same phases JSON schema as backend/main.py so Creator Studio
 * works on GitHub Pages when localhost:8001 is unreachable.
 */
(function (root) {
  'use strict';

  var PHASE_NAMES = { warmup: 'Warm-up', main: 'Main', cooldown: 'Cool-down' };

  function toInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function classifyPhase(line) {
    var t = String(line || '').trim();
    // Do not use \b after Hebrew — JS word boundaries are ASCII-only.
    if (/^חימום(?:\s|:|$)/i.test(t) || /^warm[-\s]?up\b/i.test(t)) return PHASE_NAMES.warmup;
    if (/^שחרור(?:\s|:|$|\.)/i.test(t) || /^cool[-\s]?down\b/i.test(t)) return PHASE_NAMES.cooldown;
    if (/^עיקר(?:\s|:|$)/i.test(t) || /^main\b/i.test(t)) return PHASE_NAMES.main;
    return null;
  }

  function isSessionMeta(line) {
    return (
      /מנוחה\s+\d+/.test(line) ||
      /^\d+\s*סבבים/.test(line) ||
      /חזור על הסבב/.test(line) ||
      /בין (תחנות|סטים|תרגילים)/.test(line) ||
      /ללא ציוד/.test(line) ||
      /ציוד\s*:/.test(line)
    ) && !/תחנה|תרגיל/.test(line);
  }

  function parseDurationMinutes(text) {
    var m = String(text).match(/(\d+)\s*דק/);
    return m ? toInt(m[1]) : null;
  }

  function parseParticipants(text) {
    var m = String(text).match(/(\d+)\s*אנשים/) || String(text).match(/קבוצה של\s*(\d+)/);
    return m ? toInt(m[1]) : null;
  }

  function parseEquipment(text) {
    if (/ללא ציוד/.test(text)) return [];
    var m = String(text).match(/ציוד\s*:\s*([^\n.]+)/);
    if (!m) return [];
    return m[1]
      .split(/,\s*| ו-/)
      .map(function (s) { return s.replace(/^ו/, '').trim(); })
      .filter(function (s) { return s.length > 1; });
  }

  function parseIntensity(text) {
    if (/עצימות גבוהה|HIIT|אש\b|בורפי/.test(text)) return 'high';
    if (/עצימות נמוכה|מתחילים/.test(text)) return 'low';
    return 'medium';
  }

  function parseTags(text) {
    var tags = [];
    if (/HIIT|אינטרוול/.test(text)) tags.push('cardio');
    if (/כוח|סטים של/.test(text)) tags.push('strength');
    if (/פונקציונל/.test(text)) tags.push('functional');
    if (/קבוצה|אנשים/.test(text)) tags.push('group');
    if (/ללא ציוד|ביתי/.test(text)) tags.push('bodyweight');
    if (/ריצה/.test(text)) tags.push('cardio');
    return tags.length ? tags : ['general'];
  }

  function cleanTitle(firstLine, fallback) {
    var t = String(firstLine || '')
      .replace(/,?\s*\d+\s*דקות?.*/i, '')
      .replace(/,?\s*ציוד:.*/i, '')
      .replace(/,?\s*ללא ציוד.*/i, '')
      .replace(/,?\s*עצימות.*/i, '')
      .replace(/לקבוצה של\s*\d+\s*אנשים/i, '')
      .replace(/[.,;]+$/, '')
      .trim();
    return t || fallback || 'אימון';
  }

  function splitInlineExercises(afterColon) {
    if (!afterColon) return [];
    return afterColon
      .split(/,| \+ | ו(?=\S)/)
      .map(function (s) { return s.replace(/[.]+$/, '').trim(); })
      .filter(function (s) { return s.length > 1 && !isSessionMeta(s); });
  }

  function parseExerciseLine(line, defaults) {
    defaults = defaults || {};
    var s = String(line || '')
      .replace(/^(תחנה|תרגיל|עמדה)\s*\d+\s*[:.\-–]\s*/i, '')
      .replace(/^[•\-*]\s*/, '')
      .trim();
    if (!s || classifyPhase(s) || isSessionMeta(s)) return null;
    if (/^חזור\b/.test(s) || /^מנוחה\b/.test(s)) return null;

    var notes = [];
    var sets = defaults.sets != null ? defaults.sets : null;
    var reps = defaults.reps != null ? defaults.reps : null;
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

    m = s.match(/(\d+)\s*מטר/);
    if (m) {
      notes.push(m[0]);
      s = s.replace(m[0], ' ');
    }

    var name = s.replace(/[\-–—,.:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) return null;

    if (reps == null && duration_seconds == null) {
      if (defaults.workSeconds) duration_seconds = defaults.workSeconds;
      else reps = 10;
    }
    if (sets == null && (reps != null || duration_seconds != null)) {
      sets = defaults.sets != null ? defaults.sets : 1;
    }

    return {
      name: name,
      sets: sets,
      reps: reps,
      duration_seconds: duration_seconds,
      rest_seconds: rest_seconds,
      notes: notes.length ? notes.join(', ') : null
    };
  }

  function scanSessionDefaults(text) {
    var defaults = { sets: null, reps: null, rest: null, workSeconds: null };
    var rest = text.match(/מנוחה\s+(\d+)\s*(?:שניות|שנ)/);
    if (rest) defaults.rest = toInt(rest[1]);
    var rounds = text.match(/(\d+)\s*סבבים/);
    if (rounds) defaults.sets = toInt(rounds[1]);
    var stations = text.match(/(\d+)\s*תחנות/);
    var cycles = text.match(/(\d+)\s*סבבים/);
    if (stations && cycles) defaults.sets = toInt(cycles[1]);
    var twice = text.match(/חזור על הסבב\s+פעמיים/);
    if (twice && !defaults.sets) defaults.sets = 2;
    var work = text.match(/(\d+)\s*שניות עבודה/);
    if (work) defaults.workSeconds = toInt(work[1]);
    var restHiit = text.match(/(\d+)\s*שניות מנוחה/);
    if (restHiit) defaults.rest = toInt(restHiit[1]);
    return defaults;
  }

  function emptyPhase(name, minutes) {
    return { name: name, duration_minutes: minutes || null, exercises: [] };
  }

  function parseWorkoutClient(text) {
    var raw = String(text || '').trim();
    if (!raw) {
      return {
        title: 'אימון',
        duration_minutes: 30,
        participants: null,
        equipment: [],
        phases: [],
        intensity: 'medium',
        tags: ['general']
      };
    }

    var lines = raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var defaults = scanSessionDefaults(raw);
    var duration_minutes = parseDurationMinutes(raw) || 30;
    var participants = parseParticipants(raw);
    var equipment = parseEquipment(raw);
    var intensity = parseIntensity(raw);
    var tags = parseTags(raw);
    var title = cleanTitle(lines[0], 'אימון');

    var phases = [];
    var current = null;
    var sawExplicitPhase = false;

    function ensure(name) {
      if (current && current.name === name) return current;
      var found = null;
      for (var i = 0; i < phases.length; i++) {
        if (phases[i].name === name) { found = phases[i]; break; }
      }
      if (found) {
        current = found;
        return current;
      }
      current = emptyPhase(name, null);
      phases.push(current);
      return current;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var phaseKind = classifyPhase(line);
      if (phaseKind) {
        sawExplicitPhase = true;
        current = ensure(phaseKind);
        var mins = parseDurationMinutes(line);
        if (mins) current.duration_minutes = mins;
        var colon = line.indexOf(':');
        if (colon !== -1) {
          var inlineDefaults = phaseKind === PHASE_NAMES.main ? defaults : {
            sets: 1, reps: null, rest: null,
            workSeconds: Math.max(30, Math.round(((mins || 5) * 60) / 3))
          };
          var inline = splitInlineExercises(line.slice(colon + 1));
          for (var j = 0; j < inline.length; j++) {
            var ex = parseExerciseLine(inline[j], inlineDefaults);
            if (ex) current.exercises.push(ex);
          }
        }
        continue;
      }

      if (i === 0) continue;
      if (isSessionMeta(line)) continue;

      var parsed = parseExerciseLine(line, defaults);
      if (!parsed) continue;
      // Warm-up is usually a single header line; following work belongs to Main.
      // Cool-down at the end keeps the lines that follow it.
      if (!current || current.name === PHASE_NAMES.warmup) {
        current = ensure(PHASE_NAMES.main);
      }
      current.exercises.push(parsed);
    }

    if (!sawExplicitPhase && phases.length === 0) {
      var main = emptyPhase(PHASE_NAMES.main, Math.max(10, duration_minutes - 10));
      for (var k = 1; k < lines.length; k++) {
        var p = parseExerciseLine(lines[k], defaults);
        if (p) main.exercises.push(p);
      }
      if (main.exercises.length) phases.push(main);
    }

    function hasPhase(name) {
      for (var i = 0; i < phases.length; i++) if (phases[i].name === name) return phases[i];
      return null;
    }

    if (!hasPhase(PHASE_NAMES.warmup)) {
      phases.unshift({
        name: PHASE_NAMES.warmup,
        duration_minutes: 5,
        exercises: [{
          name: 'חימום כללי',
          sets: 1,
          reps: null,
          duration_seconds: 180,
          rest_seconds: null,
          notes: null
        }]
      });
    } else if (!hasPhase(PHASE_NAMES.warmup).exercises.length) {
      hasPhase(PHASE_NAMES.warmup).exercises.push({
        name: 'חימום כללי',
        sets: 1,
        reps: null,
        duration_seconds: 180,
        rest_seconds: null,
        notes: null
      });
    }

    if (!hasPhase(PHASE_NAMES.main) || !hasPhase(PHASE_NAMES.main).exercises.length) {
      var existingMain = hasPhase(PHASE_NAMES.main);
      var fallbackEx = {
        name: title,
        sets: defaults.sets || 3,
        reps: defaults.reps || 10,
        duration_seconds: defaults.workSeconds || null,
        rest_seconds: defaults.rest || 60,
        notes: null
      };
      if (existingMain) existingMain.exercises.push(fallbackEx);
      else phases.push({ name: PHASE_NAMES.main, duration_minutes: 20, exercises: [fallbackEx] });
    }

    if (!hasPhase(PHASE_NAMES.cooldown)) {
      phases.push({
        name: PHASE_NAMES.cooldown,
        duration_minutes: 5,
        exercises: [{
          name: 'מתיחות',
          sets: 1,
          reps: null,
          duration_seconds: 180,
          rest_seconds: null,
          notes: null
        }]
      });
    } else if (!hasPhase(PHASE_NAMES.cooldown).exercises.length) {
      hasPhase(PHASE_NAMES.cooldown).exercises.push({
        name: 'מתיחות',
        sets: 1,
        reps: null,
        duration_seconds: 180,
        rest_seconds: null,
        notes: null
      });
    }

    var order = { 'Warm-up': 0, 'Main': 1, 'Cool-down': 2 };
    phases.sort(function (a, b) {
      return (order[a.name] != null ? order[a.name] : 9) - (order[b.name] != null ? order[b.name] : 9);
    });

    var assigned = 0;
    var missing = [];
    for (var p = 0; p < phases.length; p++) {
      if (!phases[p].duration_minutes) {
        if (phases[p].name === PHASE_NAMES.warmup || phases[p].name === PHASE_NAMES.cooldown) {
          phases[p].duration_minutes = 5;
        }
      }
      if (phases[p].duration_minutes) assigned += phases[p].duration_minutes;
      else missing.push(phases[p]);
    }
    if (missing.length) {
      var remain = Math.max(5, duration_minutes - assigned);
      var slice = Math.max(1, Math.round(remain / missing.length));
      for (var midx = 0; midx < missing.length; midx++) missing[midx].duration_minutes = slice;
    }

    var workout = {
      title: title,
      duration_minutes: duration_minutes,
      participants: participants,
      equipment: equipment,
      phases: phases,
      intensity: intensity,
      tags: tags,
      source: 'client-fallback'
    };
    var api = (typeof globalThis !== 'undefined' && globalThis.TH) || root.TH;
    if (api && typeof api.attachCatalogIds === 'function') api.attachCatalogIds(workout);
    return workout;
  }

  root.parseWorkoutClient = parseWorkoutClient;
})(typeof window !== 'undefined' ? window : this);
