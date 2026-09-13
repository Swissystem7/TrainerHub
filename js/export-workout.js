/* TrainerHub - export a built workout as JSON or as a calendar event (RFC 5545 iCalendar).
   Classic script like js/infer.js and js/ingest.js: window.THExport in the browser, module.exports in node.
   Pure and deterministic: no clock, no randomness, no network, no dependencies. Every string that reaches
   the output is escaped, never interpreted. */
(function (root) {
  'use strict';

  var DEFAULT_SET_SECONDS = 30;      // a set with no duration is counted as half a minute
  var LINE_LIMIT = 75;               // RFC 5545: a content line is at most 75 octets, excluding CRLF
  var CRLF = '\r\n';
  var DEFAULT_PRODID = '-//TrainerHub//Workout//HE';
  var DEFAULT_SUMMARY = 'אימון';

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  function nonNegative(v, fallback) {
    var n = Number(v);
    return isFiniteNumber(n) && n >= 0 ? Math.round(n) : fallback;
  }

  function phasesOf(workout) {
    return (workout && workout.phases && workout.phases.length) ? workout.phases : [];
  }

  function eachExercise(workout, fn) {
    var phases = phasesOf(workout);
    for (var p = 0; p < phases.length; p += 1) {
      var phase = phases[p] || {};
      var list = phase.exercises || [];
      for (var e = 0; e < list.length; e += 1) {
        fn(list[e] || {}, phase, p, e);
      }
    }
  }

  // The only exercise shape the export writes: seven keys, fixed order, null for anything missing.
  function exportExercise(ex) {
    ex = ex || {};
    return {
      name: ex.name == null ? null : String(ex.name),
      id: ex.id == null ? null : String(ex.id),
      sets: ex.sets == null ? null : ex.sets,
      reps: ex.reps == null ? null : ex.reps,
      duration_seconds: ex.duration_seconds == null ? null : ex.duration_seconds,
      rest_seconds: ex.rest_seconds == null ? null : ex.rest_seconds,
      notes: ex.notes == null ? null : String(ex.notes)
    };
  }

  function workoutToJson(workout) {
    var out = {
      version: 1,
      name: (workout && workout.name) ? String(workout.name) : '',
      phases: phasesOf(workout).map(function (phase) {
        phase = phase || {};
        return {
          name: phase.name == null ? null : String(phase.name),
          exercises: (phase.exercises || []).map(exportExercise)
        };
      })
    };
    return JSON.stringify(out, null, 2);
  }

  // Working time plus rest. An exercise with no duration counts as sets x 30s (one set when unstated).
  function totalSeconds(workout) {
    var total = 0;
    eachExercise(workout, function (ex) {
      var work;
      if (ex.duration_seconds != null) {
        work = nonNegative(ex.duration_seconds, 0);
      } else {
        work = nonNegative(ex.sets, 1) * DEFAULT_SET_SECONDS;
      }
      total += work + (ex.rest_seconds == null ? 0 : nonNegative(ex.rest_seconds, 0));
    });
    return total;
  }

  // RFC 5545 3.3.11: escape backslash, semicolon, comma and newline in TEXT values.
  function icsEscape(text) {
    if (text == null) return '';
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');
  }

  function utf8Length(ch) {
    var code = ch.charCodeAt(0);
    if (code < 0x80) return 1;
    if (code < 0x800) return 2;
    if (code >= 0xd800 && code <= 0xdbff) return 4;   // high surrogate: the pair is 4 octets
    return 3;
  }

  // RFC 5545 3.1: fold at 75 octets; a continuation line starts with one space, which counts.
  // Never split inside a multi-byte character or a surrogate pair.
  function foldLine(line) {
    var parts = [];
    var current = '';
    var octets = 0;
    var i = 0;
    while (i < line.length) {
      var ch = line.charAt(i);
      var step = 1;
      var code = line.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < line.length) {
        ch = line.substr(i, 2);
        step = 2;
      }
      var size = utf8Length(ch);
      if (octets + size > LINE_LIMIT) {
        parts.push(current);
        current = ' ';
        octets = 1;
      }
      current += ch;
      octets += size;
      i += step;
    }
    parts.push(current);
    return parts.join(CRLF);
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // ISO string -> UTC basic format, e.g. 2026-09-10T17:00:00Z -> 20260910T170000Z
  function toIcsStamp(iso) {
    var d = new Date(iso);
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    return String(d.getUTCFullYear()) + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
  }

  // FNV-1a 32-bit, so the UID is stable for the same workout without needing crypto in the browser.
  function fnv1a(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    var hex = h.toString(16);
    while (hex.length < 8) hex = '0' + hex;
    return hex;
  }

  function describe(workout) {
    var lines = [];
    eachExercise(workout, function (ex, phase) {
      var bits = [];
      if (phase && phase.name) bits.push(String(phase.name));
      bits.push(ex.name == null ? '' : String(ex.name));
      if (ex.duration_seconds != null) {
        bits.push(nonNegative(ex.duration_seconds, 0) + ' שניות');
      } else if (ex.sets != null || ex.reps != null) {
        bits.push(String(ex.sets == null ? 1 : ex.sets) + '×' + String(ex.reps == null ? '' : ex.reps));
      }
      lines.push(bits.join(' · '));
    });
    return lines.join('\n');
  }

  function workoutToIcs(workout, opts) {
    opts = opts || {};
    var stamp = toIcsStamp(opts.start);
    if (!stamp) throw new Error('start is required');
    var json = workoutToJson(workout);
    var uid = opts.uid ? String(opts.uid) : ('trainerhub-' + fnv1a(json));
    var seconds = totalSeconds(workout);
    var summary = (workout && workout.name) ? String(workout.name) : DEFAULT_SUMMARY;
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:' + icsEscape(opts.prodid || DEFAULT_PRODID),
      'BEGIN:VEVENT',
      'UID:' + icsEscape(uid),
      'DTSTAMP:' + stamp,          // equal to DTSTART so the same workout always exports the same bytes
      'DTSTART:' + stamp,
      'DURATION:PT' + seconds + 'S',
      'SUMMARY:' + icsEscape(summary),
      'DESCRIPTION:' + icsEscape(describe(workout)),
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    var folded = [];
    for (var i = 0; i < lines.length; i += 1) folded.push(foldLine(lines[i]));
    return folded.join(CRLF) + CRLF;
  }

  // Remove the RFC 5545 folding: CRLF followed by a single space.
  function unfold(text) {
    return String(text).replace(/\r\n /g, '');
  }

  var api = {
    DEFAULT_SET_SECONDS: DEFAULT_SET_SECONDS,
    LINE_LIMIT: LINE_LIMIT,
    workoutToJson: workoutToJson,
    totalSeconds: totalSeconds,
    icsEscape: icsEscape,
    foldLine: foldLine,
    unfold: unfold,
    workoutToIcs: workoutToIcs
  };

  root.THExport = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
