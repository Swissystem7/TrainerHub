/**
 * TrainerHub — site profile for "סריקת שטח" (site scan).
 * Classic script, no bundler. Namespace: window.THSiteProfile.
 * A site profile describes where a session takes place (width, surface,
 * features, hazards, shade). It can come from an AI vision step or from the
 * coach's manual checklist; either way it passes through normalize() so the
 * session builder only ever sees the strict schema. AI output is a suggestion:
 * every field can be toggled back by the coach before building.
 */
(function (root) {
  'use strict';

  var WIDTHS = [
    { id: 'narrow', he: 'צר' },
    { id: 'medium', he: 'בינוני' },
    { id: 'wide', he: 'רחב' }
  ];

  var SURFACES = [
    { id: 'asphalt', he: 'אספלט' },
    { id: 'grass', he: 'דשא' },
    { id: 'turf', he: 'דשא סינתטי' },
    { id: 'sand', he: 'חול' },
    { id: 'dirt', he: 'עפר' },
    { id: 'tiles', he: 'מרצפות' },
    { id: 'rubber', he: 'גומי' }
  ];

  var FEATURES = [
    { id: 'stairs', he: 'מדרגות' },
    { id: 'bench', he: 'ספסל' },
    { id: 'wall', he: 'קיר' },
    { id: 'railing', he: 'מעקה' },
    { id: 'pole', he: 'עמוד' },
    { id: 'slope', he: 'שיפוע' },
    { id: 'grass', he: 'משטח דשא' },
    { id: 'court', he: 'מגרש' },
    { id: 'playground', he: 'מתקני משחק' }
  ];

  var HAZARDS = [
    { id: 'cars', he: 'מכוניות' },
    { id: 'uneven', he: 'משטח לא אחיד' },
    { id: 'slippery', he: 'משטח חלק או רטוב' },
    { id: 'glass', he: 'זכוכיות או פסולת' },
    { id: 'dark', he: 'תאורה חלשה' },
    { id: 'crowd', he: 'עוברים ושבים' },
    { id: 'water', he: 'מים או בור' },
    { id: 'heat', he: 'חשיפה לשמש' }
  ];

  var LISTS = { surface: SURFACES, features: FEATURES, hazards: HAZARDS };
  var MAX_METERS = 500;

  function ids(list) { return list.map(function (x) { return x.id; }); }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].he;
    return id;
  }

  function clamp01(v) {
    var n = Number(v);
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  }

  /** Keep only known ids, in schema order, without duplicates. */
  function pickKnown(list, value) {
    var wanted = Array.isArray(value) ? value : (typeof value === 'string' ? [value] : []);
    var folded = wanted.map(function (v) { return String(v).trim().toLowerCase(); });
    return ids(list).filter(function (id) { return folded.indexOf(id) !== -1; });
  }

  function widthFromMeters(m) {
    if (m < 6) return 'narrow';
    if (m < 20) return 'medium';
    return 'wide';
  }

  /** Any object → strict SiteProfile. Unknown keys and values are dropped. */
  function normalize(raw, source) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var out = {
      width: 'medium',
      surface: pickKnown(SURFACES, raw.surface),
      features: pickKnown(FEATURES, raw.features),
      hazards: pickKnown(HAZARDS, raw.hazards),
      shade: raw.shade === true || raw.shade === 'true',
      source: (source || raw.source) === 'ai' ? 'ai' : 'manual',
      confidence: {}
    };
    var meters = Number(raw.approxMeters);
    if (raw.approxMeters != null && raw.approxMeters !== '' && isFinite(meters) && meters > 0) {
      out.approxMeters = Math.round(Math.min(meters, MAX_METERS));
    }
    var w = String(raw.width || '').trim().toLowerCase();
    if (ids(WIDTHS).indexOf(w) !== -1) out.width = w;
    else if (out.approxMeters) out.width = widthFromMeters(out.approxMeters);
    var conf = raw.confidence && typeof raw.confidence === 'object' ? raw.confidence : {};
    Object.keys(conf).forEach(function (k) {
      var known = k === 'width' || k === 'surface' || k === 'shade' ||
        ids(FEATURES).indexOf(k) !== -1 || ids(HAZARDS).indexOf(k) !== -1;
      var c = clamp01(conf[k]);
      if (known && c != null) out.confidence[k] = c;
    });
    return out;
  }

  /** Empty manual profile — the no-AI path starts here. */
  function emptyProfile() { return normalize({}, 'manual'); }

  /** Pull the first JSON object out of a model reply (plain, fenced, or with prose around it). */
  function extractJson(text) {
    var s = String(text == null ? '' : text);
    var start = s.indexOf('{');
    if (start === -1) return null;
    var depth = 0;
    var inStr = false;
    for (var i = start; i < s.length; i++) {
      var ch = s.charAt(i);
      if (inStr) {
        if (ch === '\\') i++;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) return s.slice(start, i + 1);
    }
    return null;
  }

  /** Model reply → { ok, profile, error }. Never throws; a bad reply falls back to an empty AI profile. */
  function parseAiResponse(text) {
    var raw = typeof text === 'object' && text !== null ? text : null;
    if (!raw) {
      var json = extractJson(text);
      if (!json) return { ok: false, profile: normalize({}, 'ai'), error: 'no-json' };
      try { raw = JSON.parse(json); } catch (e) {
        return { ok: false, profile: normalize({}, 'ai'), error: 'bad-json' };
      }
    }
    return { ok: true, profile: normalize(raw, 'ai'), error: null };
  }

  /** Coach correction: flip one chip (list kinds) or set width/shade. Returns a new profile, source becomes manual. */
  function toggle(profile, kind, value) {
    var p = normalize(profile, profile && profile.source);
    if (kind === 'width') {
      p.width = ids(WIDTHS).indexOf(value) !== -1 ? value : p.width;
      delete p.approxMeters;
    } else if (kind === 'shade') {
      p.shade = value == null ? !p.shade : !!value;
    } else if (LISTS[kind]) {
      var has = p[kind].indexOf(value) !== -1;
      var next = has ? p[kind].filter(function (x) { return x !== value; }) : p[kind].concat([value]);
      p[kind] = pickKnown(LISTS[kind], next);
    } else {
      return p;
    }
    delete p.confidence[kind === 'surface' || kind === 'width' || kind === 'shade' ? kind : value];
    p.source = 'manual';
    return p;
  }

  /** Chip model for the "מה זיהיתי" / "מה יש בשטח?" card. */
  function chips(profile) {
    var p = normalize(profile, profile && profile.source);
    var out = WIDTHS.map(function (w) { return { kind: 'width', id: w.id, he: 'רוחב: ' + w.he, on: p.width === w.id }; });
    ['surface', 'features', 'hazards'].forEach(function (kind) {
      LISTS[kind].forEach(function (x) {
        out.push({ kind: kind, id: x.id, he: (kind === 'hazards' ? 'סכנה: ' : kind === 'surface' ? 'משטח: ' : '') + x.he, on: p[kind].indexOf(x.id) !== -1 });
      });
    });
    out.push({ kind: 'shade', id: 'shade', he: 'צל', on: p.shade });
    return out;
  }

  /** One Hebrew line, e.g. "רוחב: צר ~4 מ׳ · משטח: אספלט · מדרגות, ספסל · סכנה: מכוניות". */
  function summaryHe(profile) {
    var p = normalize(profile, profile && profile.source);
    var parts = ['רוחב: ' + labelOf(WIDTHS, p.width) + (p.approxMeters ? ' ~' + p.approxMeters + ' מ׳' : '')];
    if (p.surface.length) parts.push('משטח: ' + p.surface.map(function (x) { return labelOf(SURFACES, x); }).join(', '));
    if (p.features.length) parts.push(p.features.map(function (x) { return labelOf(FEATURES, x); }).join(', '));
    if (p.hazards.length) parts.push('סכנה: ' + p.hazards.map(function (x) { return labelOf(HAZARDS, x); }).join(', '));
    if (p.shade) parts.push('יש צל');
    return parts.join(' · ');
  }

  var api = {
    WIDTHS: WIDTHS,
    SURFACES: SURFACES,
    FEATURES: FEATURES,
    HAZARDS: HAZARDS,
    normalize: normalize,
    emptyProfile: emptyProfile,
    extractJson: extractJson,
    parseAiResponse: parseAiResponse,
    toggle: toggle,
    chips: chips,
    summaryHe: summaryHe
  };

  root.THSiteProfile = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
