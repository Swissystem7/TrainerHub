'use strict';
// Library-gap agent — duplicate detection against the catalog and the review queue.
// A candidate is a duplicate when the same YouTube/Drive id already exists, when the normalised Hebrew
// name matches an existing entry (spelling tolerance of one edit for names of 6+ letters, which covers
// סמיכה/שמיכה), or when the same video is already waiting in the queue.
const Infer = require('../../../js/infer.js');

function normName(s) {
  return Infer.fold(String(s == null ? '' : s)).replace(/[^\p{L}\p{N}]+/gu, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function sameName(a, b) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.length >= 6 && y.length >= 6 && levenshtein(x, y) <= 1;
}

function entriesOf(catalog) {
  if (!catalog) return [];
  if (Array.isArray(catalog)) return catalog;
  if (Array.isArray(catalog.items)) return catalog.items;
  return Object.values(catalog).filter((e) => e && typeof e === 'object' && !Array.isArray(e));
}

function catalogIndex(catalog, driveCatalog) {
  const idx = { youtubeIds: new Map(), driveIds: new Map(), names: [], ids: new Set() };
  for (const e of entriesOf(catalog).concat(entriesOf(driveCatalog))) {
    if (!e || !e.id) continue;
    idx.ids.add(e.id);
    if (e.youtubeId) idx.youtubeIds.set(e.youtubeId, e.id);
    if (e.driveId) idx.driveIds.set(e.driveId, e.id);
    if (e.he) idx.names.push({ he: e.he, id: e.id });
  }
  return idx;
}

// Returns null when the candidate is new, otherwise { reason, matchId }.
function findDuplicate(candidate, index, queue) {
  const c = candidate || {};
  if (c.youtubeId && index.youtubeIds.has(c.youtubeId)) return { reason: 'youtube-id', matchId: index.youtubeIds.get(c.youtubeId) };
  if (c.driveId && index.driveIds.has(c.driveId)) return { reason: 'drive-id', matchId: index.driveIds.get(c.driveId) };
  const name = c.title || c.he || '';
  for (const n of index.names) {
    if (sameName(name, n.he)) return { reason: 'name', matchId: n.id };
  }
  for (const q of (queue && queue.candidates) || []) {
    if (!q || q.status === 'rejected') continue;
    if (c.youtubeId && q.youtubeId === c.youtubeId) return { reason: 'queued', matchId: q.id };
    if (c.driveId && q.driveId === c.driveId) return { reason: 'queued', matchId: q.id };
  }
  return null;
}

module.exports = { normName, levenshtein, sameName, entriesOf, catalogIndex, findDuplicate };
