'use strict';
// Library-gap agent — what is missing in the exercise library.
//
// Three kinds of gap are computed from the catalog itself, one comes from people:
//   no-video        an entry has no playable source (available:false, or no file/driveId/youtubeId)
//   unavailable     an entry's media URL answered 404/410 when checked (never on a network error)
//   no-alternative  a (muscle, equipment, level) combination has exactly one playable exercise, so the
//                   "החלף" button has nothing to offer
//   manual          a person reported a gap through "חסר לי תרגיל" (issue label exercise-gap)
// Surface / terrain suitability is NEVER inferred here: it is only carried through when a person stated
// it explicitly, and every candidate stays "requires trainer approval".
const { entriesOf } = require('./dedupe.js');

function playable(e) {
  if (!e || e.available === false) return false;
  return !!((e.file && /^https?:\/\//i.test(e.file)) || e.driveId || e.youtubeId || e.externalUrl);
}

function comboKey(muscle, equipment, level) {
  return muscle + '|' + equipment + '|' + level;
}

function queryFor(gap) {
  const parts = [gap.he || gap.muscle || ''];
  if (gap.equipment && gap.equipment !== 'none') parts.push(gap.equipment);
  parts.push('תרגיל');
  return parts.filter(Boolean).join(' ').trim();
}

function findGaps({ catalog, driveCatalog, manualReports = [], availability = {} } = {}) {
  const entries = entriesOf(catalog).concat(entriesOf(driveCatalog));
  const gaps = [];
  const seen = new Set();
  const push = (g) => {
    const key = g.kind + ':' + (g.exerciseId || g.combo || g.issueNumber || g.he);
    if (seen.has(key)) return;
    seen.add(key);
    g.id = key;
    g.query = queryFor(g);
    gaps.push(g);
  };

  for (const e of entries) {
    if (!e || !e.id) continue;
    if (availability[e.id] === false) {
      push({ kind: 'unavailable', exerciseId: e.id, he: e.he || '', muscles: e.muscles || [], equipment: (e.equipment || [])[0] || 'none', level: e.level || '' });
    } else if (!playable(e)) {
      push({ kind: 'no-video', exerciseId: e.id, he: e.he || '', muscles: e.muscles || [], equipment: (e.equipment || [])[0] || 'none', level: e.level || '' });
    }
  }

  const combos = new Map();
  for (const e of entries) {
    if (!playable(e) || availability[e.id] === false) continue;
    for (const m of e.muscles || []) {
      for (const eq of (e.equipment && e.equipment.length ? e.equipment : ['none'])) {
        const key = comboKey(m, eq, e.level || '');
        if (!combos.has(key)) combos.set(key, []);
        combos.get(key).push(e.id);
      }
    }
  }
  for (const [key, ids] of combos) {
    if (ids.length === 1) {
      const [muscle, equipment, level] = key.split('|');
      push({ kind: 'no-alternative', combo: key, muscle, equipment, level, only: ids[0], he: '' });
    }
  }

  for (const r of manualReports) {
    if (!r) continue;
    push({
      kind: 'manual', issueNumber: r.issueNumber || null, exerciseId: r.exerciseId || null,
      he: r.he || r.text || '', muscles: r.muscles || [], equipment: r.equipment || 'none', level: r.level || '',
      surface: r.surface || null,           // only what the person wrote, never inferred
      reportedBy: r.reportedBy || null,
    });
  }

  const order = { manual: 0, unavailable: 1, 'no-video': 2, 'no-alternative': 3 };
  gaps.sort((a, b) => (order[a.kind] - order[b.kind]) || String(a.id).localeCompare(String(b.id)));
  return gaps;
}

// HEAD-checks media URLs. Marks unavailable ONLY on 404/410; a network error or a 5xx is "unknown"
// (null) so a flaky provider can never make the library look broken. Capped so a run stays cheap.
async function checkAvailability(catalog, { fetchImpl, max = 25, timeoutMs = 8000 } = {}) {
  const result = {};
  if (!fetchImpl) return result;
  let n = 0;
  for (const e of entriesOf(catalog)) {
    if (!e || !e.file || !/^https?:\/\//i.test(e.file) || n >= max) continue;
    n++;
    try {
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      const res = await fetchImpl(e.file, { method: 'HEAD', redirect: 'follow', signal: ctrl ? ctrl.signal : undefined });
      if (timer) clearTimeout(timer);
      result[e.id] = (res.status === 404 || res.status === 410) ? false : (res.ok ? true : null);
    } catch (err) {
      result[e.id] = null;
    }
  }
  return result;
}

module.exports = { playable, findGaps, checkAvailability, queryFor };
