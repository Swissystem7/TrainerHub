/**
 * TrainerHub — מחולל וקולט קישורי שיתוף מקודדים (Shareable Plan URL).
 * CommonJS / UMD / Classic Script.
 */
((root, factory) => {
  const api = factory();
  if (root) {
    root.THPlanLinkCodec = api;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.PlanLinkCodec = api;
      root.TH.encodePlanToQuery = api.encodePlanToQuery;
      root.TH.decodePlanFromQuery = api.decodePlanFromQuery;
    }
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const PARAM_KEY = 'plan';
  const MAX_QUERY_LENGTH = 4096;

  function sanitizeText(value, maxLen) {
    if (value == null) return '';
    const s = String(value)
      .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const limit = typeof maxLen === 'number' && maxLen > 0 ? maxLen : 200;
    return s.slice(0, limit);
  }

  function parsePositiveInt(val) {
    if (typeof val === 'number') {
      return Number.isFinite(val) && val > 0 ? Math.round(val) : null;
    }
    if (typeof val === 'string' && val.trim()) {
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }
    return null;
  }

  function parseNonNegativeInt(val) {
    if (typeof val === 'number') {
      return Number.isFinite(val) && val >= 0 ? Math.round(val) : null;
    }
    if (typeof val === 'string' && val.trim()) {
      const n = Number(val);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
    return null;
  }

  function parseReps(val) {
    if (typeof val === 'number') {
      return Number.isFinite(val) && val > 0 ? Math.round(val) : null;
    }
    if (typeof val === 'string') {
      const s = sanitizeText(val, 30);
      return s || null;
    }
    return null;
  }

  function parseEquipment(raw) {
    if (Array.isArray(raw)) {
      return raw.map((item) => sanitizeText(String(item), 60)).filter(Boolean);
    }
    if (typeof raw === 'string') {
      const clean = sanitizeText(raw, 60);
      return clean ? [clean] : [];
    }
    return [];
  }

  function utf8ToBase64Url(str) {
    if (typeof str !== 'string' || !str) {
      return '';
    }
    let b64;
    if (typeof Buffer !== 'undefined') {
      b64 = Buffer.from(str, 'utf8').toString('base64');
    } else {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      b64 = btoa(bin);
    }
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function base64UrlToUtf8(b64url) {
    if (typeof b64url !== 'string') {
      return null;
    }
    const clean = b64url.replace(/=+$/, '').trim();
    if (!clean || !/^[A-Za-z0-9_-]+$/.test(clean)) {
      return null;
    }
    let b64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    try {
      const bytes =
        typeof Buffer !== 'undefined'
          ? Buffer.from(b64, 'base64')
          : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      return null;
    }
  }

  function compactEx(ex) {
    if (!ex) return null;
    if (typeof ex === 'string') {
      const sName = sanitizeText(ex, 100);
      return sName ? { n: sName } : null;
    }
    const rawName = ex.name ?? ex.n ?? ex.name_he;
    const sName = sanitizeText(rawName != null ? String(rawName) : '', 100);
    if (!sName) return null;

    const item = { n: sName };
    if (ex.id != null) {
      const cleanId = sanitizeText(String(ex.id), 50);
      if (cleanId) item.id = cleanId;
    }

    const sets = parsePositiveInt(ex.sets ?? ex.s);
    if (sets != null) item.s = sets;

    const reps = parseReps(ex.reps ?? ex.r);
    if (reps != null) item.r = reps;

    const ds = parsePositiveInt(ex.duration_seconds ?? ex.durationSeconds ?? ex.ds);
    if (ds != null) item.ds = ds;

    const rs = parseNonNegativeInt(ex.rest_seconds ?? ex.restSeconds ?? ex.rs);
    if (rs != null) item.rs = rs;

    const rawNotes = ex.notes ?? ex.no;
    if (typeof rawNotes === 'string') {
      const sNotes = sanitizeText(rawNotes, 200);
      if (sNotes) item.no = sNotes;
    }

    return item;
  }

  function expandEx(item) {
    if (!item) return null;
    if (typeof item === 'string') {
      const sName = sanitizeText(item, 100);
      return sName ? { name: sName, sets: 1, reps: null } : null;
    }
    const rawName = item.name ?? item.n ?? item.name_he;
    const sName = sanitizeText(rawName != null ? String(rawName) : '', 100);
    if (!sName) return null;

    const ex = { name: sName };
    if (item.id != null) {
      const sId = sanitizeText(String(item.id), 50);
      if (sId) ex.id = sId;
    }

    const sets = parsePositiveInt(item.sets ?? item.s);
    if (sets != null) ex.sets = sets;

    const reps = parseReps(item.reps ?? item.r);
    if (reps != null) ex.reps = reps;

    const ds = parsePositiveInt(item.duration_seconds ?? item.durationSeconds ?? item.ds);
    if (ds != null) ex.duration_seconds = ds;

    const rs = parseNonNegativeInt(item.rest_seconds ?? item.restSeconds ?? item.rs);
    if (rs != null) ex.rest_seconds = rs;

    const rawNotes = item.notes ?? item.no;
    if (typeof rawNotes === 'string') {
      const sNotes = sanitizeText(rawNotes, 200);
      if (sNotes) ex.notes = sNotes;
    }

    return ex;
  }

  function compactPlan(plan) {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      return null;
    }
    const compact = {};

    const rawTitle = plan.title ?? plan.t ?? plan.name;
    if (typeof rawTitle === 'string') {
      const cleanTitle = sanitizeText(rawTitle, 120);
      if (cleanTitle) compact.t = cleanTitle;
    }

    const dur = parsePositiveInt(plan.duration_minutes ?? plan.durationMinutes ?? plan.d ?? plan.duration);
    if (dur != null) {
      compact.d = dur;
    }

    const cleanEquip = parseEquipment(plan.equipment ?? plan.q);
    if (cleanEquip.length > 0) {
      compact.q = cleanEquip;
    }

    const phases = plan.phases ?? plan.p;
    if (Array.isArray(phases)) {
      const compactedPhases = [];
      for (const ph of phases) {
        if (!ph || typeof ph !== 'object' || Array.isArray(ph)) continue;
        const phName = sanitizeText(String(ph.name ?? ph.n ?? ''), 60) || 'עיקרי';
        const rawExList = ph.exercises ?? ph.e;
        const exList = Array.isArray(rawExList) ? rawExList.map(compactEx).filter(Boolean) : [];
        compactedPhases.push({ n: phName, e: exList });
      }
      if (compactedPhases.length > 0) {
        compact.p = compactedPhases;
      }
    }

    const directEx = plan.exercises ?? plan.e;
    if (Array.isArray(directEx)) {
      const compactedEx = directEx.map(compactEx).filter(Boolean);
      if (compactedEx.length > 0) {
        compact.e = compactedEx;
      }
    }

    if (!compact.t && !compact.e && !compact.p) {
      return null;
    }
    return compact;
  }

  function expandPlan(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      return null;
    }

    const rawTitle = c.title ?? c.t ?? c.name;
    const cleanTitle = rawTitle != null ? sanitizeText(String(rawTitle), 120) : '';

    const durationMinutes = parsePositiveInt(
      c.duration_minutes ?? c.durationMinutes ?? c.d ?? c.duration
    );

    const equipment = parseEquipment(c.equipment ?? c.q);

    let exercises = [];
    const rawE = c.exercises ?? c.e;
    if (Array.isArray(rawE)) {
      exercises = rawE.map(expandEx).filter(Boolean);
    }

    let phases = [];
    const rawP = c.phases ?? c.p;
    if (Array.isArray(rawP)) {
      for (const ph of rawP) {
        if (!ph || typeof ph !== 'object' || Array.isArray(ph)) continue;
        const phName = sanitizeText(String(ph.name ?? ph.n ?? ''), 60) || 'עיקרי';
        const rawPhEx = ph.exercises ?? ph.e;
        const phEx = Array.isArray(rawPhEx) ? rawPhEx.map(expandEx).filter(Boolean) : [];
        phases.push({ name: phName, exercises: phEx });
      }
    }

    if (exercises.length === 0) {
      for (const ph of phases) {
        if (Array.isArray(ph.exercises)) {
          exercises = exercises.concat(ph.exercises);
        }
      }
    }

    if (phases.length === 0 && exercises.length > 0) {
      phases = [{ name: 'עיקרי', exercises: exercises }];
    }

    if (!cleanTitle && exercises.length === 0) {
      return null;
    }

    return {
      title: cleanTitle || 'אימון',
      duration_minutes: durationMinutes,
      equipment: equipment,
      exercises: exercises,
      phases: phases
    };
  }

  function encodePlanToQuery(plan) {
    const compact = compactPlan(plan);
    if (!compact) {
      return '';
    }
    const jsonStr = JSON.stringify(compact);
    const encoded = utf8ToBase64Url(jsonStr);
    return `${PARAM_KEY}=${encoded}`;
  }

  function decodePlanFromQuery(searchString) {
    if (typeof searchString !== 'string') {
      return null;
    }
    const trimmed = searchString.trim();
    if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) {
      return null;
    }

    const qs = trimmed.slice(trimmed.indexOf('?') + 1);
    const rawParam = new URLSearchParams(qs).get(PARAM_KEY);
    const jsonStr = base64UrlToUtf8(rawParam);
    if (!jsonStr) {
      return null;
    }

    try {
      return expandPlan(JSON.parse(jsonStr));
    } catch (_) {
      return null;
    }
  }

  return {
    PARAM_KEY,
    MAX_QUERY_LENGTH,
    sanitizeText,
    compactPlan,
    expandPlan,
    encodePlanToQuery,
    decodePlanFromQuery,
    utf8ToBase64Url,
    base64UrlToUtf8
  };
});
