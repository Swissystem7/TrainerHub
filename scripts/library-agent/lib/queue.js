'use strict';
// Library-gap agent — the review queue (data/library-agent/candidates.json) and the sources ledger.
//
// Every candidate keeps two strictly separated parts:
//   observed  what the source itself says (title, creator, url, duration, description snippet) with a
//             `basis` that names where it came from: 'youtube-metadata' or 'submitter'. The agent never
//             watches a video, so nothing here is ever presented as seen.
//   proposed  what the agent suggests (muscles, equipment, level, which gap it fills) with its own basis:
//             'title-and-description-only' or 'submitter-description'. Surface/terrain suitability is
//             null unless a person stated it, and trainerApprovalRequired is always true.
// Statuses shown on the site: submitted (נשלחה) -> in-review (בבדיקה) -> approved (אושרה) | rejected (נדחתה).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Infer = require('../../../js/infer.js');

const QUEUE_REL = path.join('data', 'library-agent', 'candidates.json');
const SOURCES_REL = path.join('data', 'library-agent', 'sources.json');
const CACHE_REL = path.join('data', 'library-agent', 'search-cache.json');
const STATUSES = ['submitted', 'in-review', 'approved', 'rejected'];
const STATUS_HE = { submitted: 'נשלחה', 'in-review': 'בבדיקה', approved: 'אושרה', rejected: 'נדחתה' };

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { return fallback; }
}
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function loadQueue(root) {
  const q = readJson(path.join(root, QUEUE_REL), null);
  return q && Array.isArray(q.candidates) ? q : { version: 1, updatedAt: null, candidates: [] };
}
function saveQueue(root, queue, now = new Date().toISOString()) {
  queue.updatedAt = now;
  writeJson(path.join(root, QUEUE_REL), queue);
}
function loadCache(root) { return readJson(path.join(root, CACHE_REL), {}); }
function saveCache(root, cache) { writeJson(path.join(root, CACHE_REL), cache); }

function candidateId(source) {
  const key = source.youtubeId ? 'yt:' + source.youtubeId : source.driveId ? 'gd:' + source.driveId : 'url:' + source.url;
  return 'cand_' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 10);
}

function fromSubmission(sub, meta, gap) {
  const now = meta && meta.submittedAt ? meta.submittedAt : null;
  return {
    id: candidateId(sub),
    status: 'submitted',
    createdAt: now,
    from: 'submission',
    source: sub.source, url: sub.url, youtubeId: sub.youtubeId || null, driveId: sub.driveId || null,
    issueNumber: meta ? meta.issueNumber : null, issueUrl: meta ? meta.issueUrl : null,
    observed: {
      basis: 'submitter',                // the submitter's own words; not verified by the agent
      title: sub.title, description: sub.description || '', equipmentText: sub.equipment || [],
      audienceText: sub.audience || '', startSec: sub.startSec, endSec: sub.endSec,
      creator: null, durationSec: null, captionsAvailable: null,
    },
    proposed: {
      basis: 'submitter-description',
      he: sub.title,
      muscles: sub.inferred ? sub.inferred.muscles : [], equipment: sub.inferred ? sub.inferred.equipment : [],
      level: sub.inferred ? sub.inferred.level : '',
      gapMatch: gap ? { gapId: gap.id, kind: gap.kind, why: 'the submitter named this gap' } : null,
      surface: null, trainerApprovalRequired: true,
    },
    attribution: { creator: null, sourceUrl: sub.url, embedOnly: true, license: 'unknown' },
    history: [{ at: now, status: 'submitted', note: 'received from issue #' + (meta ? meta.issueNumber : '?') }],
  };
}

function fromYouTube(item, gap, now) {
  const proposal = Infer.proposeEntry({ url: item.url, name: gap.he || gap.muscle || item.title });
  const inferred = proposal && !proposal.error ? proposal : null;
  return {
    id: candidateId(item),
    status: 'in-review',
    createdAt: now,
    from: 'youtube-search',
    source: 'youtube', url: item.url, youtubeId: item.youtubeId, driveId: null,
    issueNumber: gap.issueNumber || null, issueUrl: null,
    observed: {
      basis: 'youtube-metadata',        // API metadata only; the video itself was not watched
      title: item.title, description: item.descriptionSnippet || '', creator: item.channelTitle,
      channelId: item.channelId, publishedAt: item.publishedAt, durationSec: item.durationSec,
      captionsAvailable: item.hasCaptions === true, license: item.license || '',
    },
    proposed: {
      basis: 'title-and-description-only',
      he: gap.he || '',
      muscles: inferred ? inferred.muscles : (gap.muscles || (gap.muscle ? [gap.muscle] : [])),
      equipment: inferred ? inferred.equipment : (gap.equipment ? [gap.equipment] : []),
      level: inferred ? inferred.level : (gap.level || ''),
      gapMatch: { gapId: gap.id, kind: gap.kind, why: 'found by searching for the gap query: ' + gap.query },
      surface: null, trainerApprovalRequired: true,
    },
    attribution: { creator: item.channelTitle, sourceUrl: item.url, embedOnly: true,
      license: item.license === 'creativeCommon' ? 'creativeCommon' : 'youtube-standard' },
    history: [{ at: now, status: 'in-review', note: 'candidate from YouTube search for gap ' + gap.id }],
  };
}

// Adds or refreshes a candidate; returns 'added' | 'updated' | 'unchanged'.
function upsertCandidate(queue, cand, now) {
  const i = queue.candidates.findIndex((c) => c.id === cand.id);
  if (i < 0) {
    queue.candidates.push(cand);
    return 'added';
  }
  const cur = queue.candidates[i];
  if (cur.status === 'approved' || cur.status === 'rejected') return 'unchanged';
  cur.observed = cand.observed;
  cur.proposed = Object.assign({}, cand.proposed, { surface: cur.proposed && cur.proposed.surface != null ? cur.proposed.surface : null });
  cur.history.push({ at: now, status: cur.status, note: 'refreshed' });
  return 'updated';
}

function setStatus(queue, id, status, note, now) {
  if (!STATUSES.includes(status)) throw new Error('unknown status: ' + status);
  const c = queue.candidates.find((x) => x.id === id);
  if (!c) throw new Error('unknown candidate: ' + id);
  c.status = status;
  c.history.push({ at: now || null, status, note: note || '' });
  return c;
}

// Only APPROVED candidates ever become catalog entries, and only through this explicit step run by the
// maintainer after merging the reviewed PR. The site never reads proposed data as if it were approved.
function approvedToCatalogEntries(queue) {
  return queue.candidates
    .filter((c) => c.status === 'approved' && c.youtubeId)
    .map((c) => ({
      id: 'yt_' + c.youtubeId,
      he: c.proposed.he || c.observed.title,
      muscles: c.proposed.muscles || [],
      equipment: (c.proposed.equipment && c.proposed.equipment.length) ? c.proposed.equipment : ['none'],
      level: c.proposed.level || 'beginner',
      source: 'youtube',
      youtubeId: c.youtubeId,
      startSec: c.observed.startSec || undefined,
      endSec: c.observed.endSec || undefined,
      attribution: { creator: c.attribution.creator, sourceUrl: c.attribution.sourceUrl, license: c.attribution.license },
      available: true,
    }));
}

function summaryMarkdown(queue, run) {
  const counts = {};
  for (const c of queue.candidates) counts[c.status] = (counts[c.status] || 0) + 1;
  const lines = [
    '## Library-gap agent — run ' + (run.at || ''),
    '',
    '- gaps found: ' + (run.gaps || 0) + ' (manual ' + (run.manual || 0) + ', no-video ' + (run.noVideo || 0) + ', unavailable ' + (run.unavailable || 0) + ', no-alternative ' + (run.noAlternative || 0) + ')',
    '- submissions processed: ' + (run.submissions || 0) + ' (rejected at intake: ' + (run.rejectedSubmissions || 0) + ')',
    '- YouTube searches: ' + (run.searches || 0) + ' / budget ' + (run.searchBudget || 0) + ', provider status: ' + (run.providerStatus || 'n/a'),
    '- queue: ' + STATUSES.map((s) => s + ' ' + (counts[s] || 0)).join(', '),
    '',
    'Nothing in this queue was watched by the agent: `observed` is source metadata or the submitter\'s words, ',
    '`proposed` is a suggestion from the title/description only, surface suitability is never inferred, and ',
    'every candidate requires trainer approval. Merging this PR only updates the review queue; approved ',
    'candidates reach `js/catalog.json` through `node scripts/library-agent/run.js --apply-approved` run by a person.',
    '',
    '| id | status | from | title | creator | gap |',
    '|---|---|---|---|---|---|',
  ];
  for (const c of queue.candidates.slice(-40)) {
    lines.push('| ' + c.id + ' | ' + c.status + ' | ' + c.from + ' | ' + String(c.observed.title || '').replace(/\|/g, ' ') +
      ' | ' + String(c.observed.creator || c.attribution.creator || '') + ' | ' + (c.proposed.gapMatch ? c.proposed.gapMatch.gapId : '') + ' |');
  }
  return lines.join('\n') + '\n';
}

module.exports = {
  QUEUE_REL, SOURCES_REL, CACHE_REL, STATUSES, STATUS_HE,
  readJson, writeJson, loadQueue, saveQueue, loadCache, saveCache,
  candidateId, fromSubmission, fromYouTube, upsertCandidate, setStatus, approvedToCatalogEntries, summaryMarkdown,
};
