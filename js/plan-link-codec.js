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
    const raw = String(value);
    let s = '';
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i);
      if ((code >= 0 && code <= 8) || (code >= 11 && code <= 31) || code === 127) {
        continue;
      }
      s += raw[i];
    }
    // Strip HTML and script tags iteratively
    let prev = '';
    while (s !== prev) {
      prev = s;
      s = s.replace(/<[^>]*>/g, '');
    }
    // Remove lingering angle brackets
    s = s.replace(/[<>]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    const limit = typeof maxLen === 'number' && maxLen > 0 ? maxLen : 200;
    return s.length > limit ? s.slice(0, limit) : s;
  }

  function utf8ToBase64Url(str) {
    if (typeof str !== 'string' || !str) {
      return '';
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
      let bytes;
      if (typeof Buffer !== 'undefined') {
        bytes = Buffer.from(b64, 'base64');
      } else {
        const bin = atob(b64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      return null;
    }
  }

  function compactPlan(plan) {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      return null;
    }
    const compact = {};

    const rawTitle = plan.title ?? plan.t ?? plan.name;
    if (rawTitle && typeof rawTitle === 'string') {
      const cleanTitle = sanitizeText(rawTitle, 120);
      if (cleanTitle) compact.t = cleanTitle;
    }

    const dur = plan.duration_minutes ?? plan.durationMinutes ?? plan.d ?? plan.duration;
    if (dur != null && !Number.isNaN(Number(dur)) && Number(dur) > 0) {
      compact.d = Math.round(Number(dur));
    }

    const equip = plan.equipment ?? plan.q;
    if (Array.isArray(equip) && equip.length > 0) {
      const cleanEquip = equip.map((item) => sanitizeText(String(item), 60)).filter(Boolean);
      if (cleanEquip.length > 0) compact.q = cleanEquip;
    } else if (typeof equip === 'string' && equip.trim()) {
      const cleanEquip = sanitizeText(equip, 60);
      if (cleanEquip) compact.q = [cleanEquip];
    }

    function compactEx(ex) {
      if (!ex) return null;
      if (typeof ex === 'string') {
        const sName = sanitizeText(ex, 100);
        return sName ? { n: sName } : null;
      }
      if (typeof ex !== 'object' || Array.isArray(ex)) return null;
      const rawName = ex.name ?? ex.n ?? ex.name_he;
      const sName = sanitizeText(String(rawName || ''), 100);
      if (!sName) return null;

      const item = { n: sName };
      if (ex.id) {
        const cleanId = sanitizeText(String(ex.id), 50);
        if (cleanId) item.id = cleanId;
      }

      const sets = ex.sets ?? ex.s;
      if (sets != null && !Number.isNaN(Number(sets)) && Number(sets) > 0) {
        item.s = Math.round(Number(sets));
      }

      const reps = ex.reps ?? ex.r;
      if (reps != null) {
        if (typeof reps === 'number' && !Number.isNaN(reps) && reps > 0) {
          item.r = Math.round(reps);
        } else if (typeof reps === 'string' && reps.trim()) {
          const sReps = sanitizeText(reps, 30);
          if (sReps) item.r = sReps;
        }
      }

      const ds = ex.duration_seconds ?? ex.durationSeconds ?? ex.ds;
      if (ds != null && !Number.isNaN(Number(ds)) && Number(ds) > 0) {
        item.ds = Math.round(Number(ds));
      }

      const rs = ex.rest_seconds ?? ex.restSeconds ?? ex.rs;
      if (rs != null && !Number.isNaN(Number(rs)) && Number(rs) >= 0) {
        item.rs = Math.round(Number(rs));
      }

      const notes = ex.notes ?? ex.no;
      if (notes && typeof notes === 'string') {
        const sNotes = sanitizeText(notes, 200);
        if (sNotes) item.no = sNotes;
      }

      return item;
    }

    const phases = plan.phases ?? plan.p;
    if (Array.isArray(phases) && phases.length > 0) {
      const compactedPhases = phases
        .map((ph) => {
          if (!ph || typeof ph !== 'object' || Array.isArray(ph)) return null;
          const phName = sanitizeText(String(ph.name || ph.n || 'עיקרי'), 60);
          const rawExList = ph.exercises ?? ph.e;
          const exList = Array.isArray(rawExList) ? rawExList.map(compactEx).filter(Boolean) : [];
          return { n: phName, e: exList };
        })
        .filter(Boolean);
      if (compactedPhases.length > 0) {
        compact.p = compactedPhases;
      }
    }

    const directEx = plan.exercises ?? plan.e;
    if (Array.isArray(directEx) && directEx.length > 0) {
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
    const cleanTitle = rawTitle ? sanitizeText(String(rawTitle), 120) : '';

    const dur = c.duration_minutes ?? c.durationMinutes ?? c.d ?? c.duration;
    const durationMinutes =
      dur != null && !Number.isNaN(Number(dur)) && Number(dur) > 0 ? Math.round(Number(dur)) : null;

    let equipment = [];
    const rawQ = c.equipment ?? c.q;
    if (Array.isArray(rawQ)) {
      equipment = rawQ.map((x) => sanitizeText(String(x), 60)).filter(Boolean);
    } else if (typeof rawQ === 'string' && rawQ.trim()) {
      const cleanEquip = sanitizeText(rawQ, 60);
      if (cleanEquip) equipment = [cleanEquip];
    }

    function expandEx(item) {
      if (!item) return null;
      if (typeof item === 'string') {
        const sName = sanitizeText(item, 100);
        return sName ? { name: sName, sets: 1, reps: null } : null;
      }
      if (typeof item !== 'object' || Array.isArray(item)) return null;
      const rawName = item.name ?? item.n ?? item.name_he;
      const sName = sanitizeText(String(rawName || ''), 100);
      if (!sName) return null;

      const ex = { name: sName };
      if (item.id) {
        const sId = sanitizeText(String(item.id), 50);
        if (sId) ex.id = sId;
      }

      const sets = item.sets ?? item.s;
      if (sets != null && !Number.isNaN(Number(sets)) && Number(sets) > 0) {
        ex.sets = Math.round(Number(sets));
      }

      const reps = item.reps ?? item.r;
      if (reps != null) {
        if (typeof reps === 'number' && !Number.isNaN(reps) && reps > 0) {
          ex.reps = Math.round(reps);
        } else if (typeof reps === 'string' && reps.trim()) {
          const sReps = sanitizeText(reps, 30);
          if (sReps) ex.reps = sReps;
        }
      }

      const ds = item.duration_seconds ?? item.durationSeconds ?? item.ds;
      if (ds != null && !Number.isNaN(Number(ds)) && Number(ds) > 0) {
        ex.duration_seconds = Math.round(Number(ds));
      }

      const rs = item.rest_seconds ?? item.restSeconds ?? item.rs;
      if (rs != null && !Number.isNaN(Number(rs)) && Number(rs) >= 0) {
        ex.rest_seconds = Math.round(Number(rs));
      }

      const notes = item.notes ?? item.no;
      if (notes && typeof notes === 'string') {
        const sNotes = sanitizeText(notes, 200);
        if (sNotes) ex.notes = sNotes;
      }

      return ex;
    }

    let exercises = [];
    const rawE = c.exercises ?? c.e;
    if (Array.isArray(rawE)) {
      exercises = rawE.map(expandEx).filter(Boolean);
    }

    let phases = [];
    const rawP = c.phases ?? c.p;
    if (Array.isArray(rawP)) {
      phases = rawP
        .map((ph) => {
          if (!ph || typeof ph !== 'object' || Array.isArray(ph)) return null;
          const phName = sanitizeText(String(ph.name || ph.n || 'עיקרי'), 60);
          const rawPhEx = ph.exercises ?? ph.e;
          const phEx = Array.isArray(rawPhEx) ? rawPhEx.map(expandEx).filter(Boolean) : [];
          return { name: phName, exercises: phEx };
        })
        .filter(Boolean);
    }

    if (exercises.length === 0 && phases.length > 0) {
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
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      return '';
    }
    const compact = compactPlan(plan);
    if (!compact) {
      return '';
    }
    const jsonStr = JSON.stringify(compact);
    const encoded = utf8ToBase64Url(jsonStr);
    if (!encoded) {
      return '';
    }
    return `${PARAM_KEY}=${encoded}`;
  }

  function decodePlanFromQuery(searchString) {
    if (!searchString || typeof searchString !== 'string') {
      return null;
    }
    const trimmed = searchString.trim();
    if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) {
      return null;
    }

    let qs = trimmed;
    const qIdx = qs.indexOf('?');
    if (qIdx !== -1) {
      qs = qs.slice(qIdx + 1);
    }

    let rawParam = null;
    try {
      const params = new URLSearchParams(qs);
      rawParam = params.get(PARAM_KEY);
    } catch (_) {
      return null;
    }

    if (!rawParam || typeof rawParam !== 'string' || !rawParam.trim()) {
      return null;
    }

    const cleanParam = rawParam.trim();
    if (cleanParam.length > MAX_QUERY_LENGTH) {
      return null;
    }

    const jsonStr = base64UrlToUtf8(cleanParam);
    if (!jsonStr) {
      return null;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (_) {
      return null;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return expandPlan(parsed);
  }

  return {
    PARAM_KEY,
    MAX_QUERY_LENGTH,
    sanitizeText,
    compactPlan,
    expandPlan,
    encodePlanToQuery,
    decodePlanFromQuery
  };
});
