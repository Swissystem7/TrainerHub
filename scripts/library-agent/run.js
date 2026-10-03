#!/usr/bin/env node
'use strict';
// Library-gap agent — orchestrator. Runs in GitHub Actions (or locally) with NO server:
//   1. find gaps in the exercise library (catalog + optional media availability check + manual reports)
//   2. read user submissions (GitHub issues labelled exercise-suggestion), validate, dedupe, queue
//   3. search YouTube (Data API v3, budget-capped, cached) for the top gaps, dedupe, queue
//   4. write data/library-agent/{candidates,sources,search-cache,last-run}.json and a Markdown summary
// It NEVER edits js/catalog.json on its own. --apply-approved is a separate, human-run step.
//
// Env: GITHUB_TOKEN (issues read + comments; optional), YOUTUBE_API_KEY (optional), GITHUB_REPOSITORY.
// Flags: --root DIR  --max-searches N (default 5)  --check-links  --dry-run  --summary-file FILE
//        --apply-approved  --no-issues  --now ISO (tests)
const fs = require('node:fs');
const path = require('node:path');
const gaps = require('./lib/gaps.js');
const subs = require('./lib/submissions.js');
const dedupe = require('./lib/dedupe.js');
const yt = require('./lib/youtube.js');
const queue = require('./lib/queue.js');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : def;
}
const has = (name) => process.argv.includes(name);

function labelNames(issue) {
  return ((issue && issue.labels) || []).map((l) => (typeof l === 'string' ? l : l && l.name) || '').filter(Boolean);
}

async function githubIssues(repo, token, fetchImpl, label) {
  if (!repo || !fetchImpl) return { status: 'no-repo', items: [] };
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'trainerhub-library-agent' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const url = 'https://api.github.com/repos/' + repo + '/issues?state=open&per_page=50&labels=' + encodeURIComponent(label);
  try {
    const res = await fetchImpl(url, { headers });
    if (!res.ok) return { status: 'github-failed', error: String(res.status), items: [] };
    const items = (await res.json()).filter((it) => !it.pull_request);
    return { status: 'ok', items };
  } catch (err) {
    return { status: 'github-failed', error: err && err.message ? err.message : String(err), items: [] };
  }
}

async function commentOnIssue(repo, token, fetchImpl, number, body) {
  if (!repo || !token || !fetchImpl || !number) return false;
  try {
    const res = await fetchImpl('https://api.github.com/repos/' + repo + '/issues/' + number + '/comments', {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'User-Agent': 'trainerhub-library-agent' },
      body: JSON.stringify({ body }),
    });
    return res.ok;
  } catch (err) { return false; }
}

function manualReportFromIssue(issue) {
  const f = subs.parseIssueBody(issue.body);
  return {
    issueNumber: issue.number, reportedBy: issue.user && issue.user.login ? issue.user.login : null,
    exerciseId: f.gap ? subs.clean(f.gap, 80) : null,
    he: f.title ? subs.clean(f.title, 80) : subs.clean(issue.title, 80).replace(/^\[[^\]]*\]\s*/, ''),
    text: subs.clean(f.description, 300), equipment: f.equipment ? subs.clean(f.equipment, 60) : 'none',
    level: f.audience ? subs.clean(f.audience, 30) : '',
    surface: null, // never inferred; a person may state it in the description but it is not promoted to a field
  };
}

async function main() {
  const root = path.resolve(arg('--root', path.join(__dirname, '..', '..')));
  const now = arg('--now', new Date().toISOString());
  const dry = has('--dry-run');
  const maxSearches = Number(arg('--max-searches', '5'));
  const fetchImpl = typeof fetch === 'function' ? fetch : null;
  const repo = process.env.GITHUB_REPOSITORY || 'Swissystem7/TrainerHub';
  const token = process.env.GITHUB_TOKEN || '';
  const apiKey = process.env.YOUTUBE_API_KEY || '';

  const catalog = queue.readJson(path.join(root, 'js', 'catalog.json'), {});
  const driveCatalog = queue.readJson(path.join(root, 'videos', 'drive-catalog.json'), { items: [] });
  const q = queue.loadQueue(root);
  const cache = queue.loadCache(root);
  const index = dedupe.catalogIndex(catalog, driveCatalog);
  const run = { at: now, searchBudget: maxSearches, searches: 0, submissions: 0, rejectedSubmissions: 0, providerStatus: apiKey ? 'configured' : 'not-configured' };

  if (has('--apply-approved')) {
    const entries = queue.approvedToCatalogEntries(q);
    let added = 0;
    for (const e of entries) {
      if (!catalog[e.id] && !index.youtubeIds.has(e.youtubeId)) { catalog[e.id] = e; added++; }
    }
    if (!dry) queue.writeJson(path.join(root, 'js', 'catalog.json'), catalog);
    console.log(JSON.stringify({ applied: added, total: entries.length, dryRun: dry }));
    return 0;
  }

  // 1. gaps
  let availability = {};
  if (has('--check-links') && fetchImpl && !dry) availability = await gaps.checkAvailability(catalog, { fetchImpl, max: 25 });
  const manualReports = [];
  if (!has('--no-issues')) {
    const rep = await githubIssues(repo, token, fetchImpl, 'exercise-gap');
    run.issuesStatus = rep.status;
    for (const it of rep.items) manualReports.push(manualReportFromIssue(it));
  }
  const found = gaps.findGaps({ catalog, driveCatalog, manualReports, availability });
  run.gaps = found.length;
  run.manual = found.filter((g) => g.kind === 'manual').length;
  run.noVideo = found.filter((g) => g.kind === 'no-video').length;
  run.unavailable = found.filter((g) => g.kind === 'unavailable').length;
  run.noAlternative = found.filter((g) => g.kind === 'no-alternative').length;

  // 2. submissions
  const rejected = [];
  if (!has('--no-issues')) {
    const rep = await githubIssues(repo, token, fetchImpl, 'exercise-suggestion');
    for (const issue of rep.items) {
      const r = subs.submissionFromIssue(issue);
      run.submissions++;
      if (!r.ok) {
        run.rejectedSubmissions++;
        rejected.push({ issue: issue.number, error: r.error });
        if (!dry) await commentOnIssue(repo, token, fetchImpl, issue.number,
          'ההצעה לא התקבלה לבדיקה: ' + r.message + '\n\n(סטטוס: נדחתה. אפשר לתקן ולהגיש שוב דרך suggest.html)');
        continue;
      }
      const gap = r.submission.gapRef ? found.find((g) => g.exerciseId === r.submission.gapRef || g.id === r.submission.gapRef) : null;
      const cand = queue.fromSubmission(r.submission, r.meta, gap);
      const dup = dedupe.findDuplicate({ youtubeId: cand.youtubeId, driveId: cand.driveId, title: cand.observed.title }, index, { candidates: q.candidates.filter((c) => c.id !== cand.id) });
      if (dup && dup.reason !== 'queued') {
        cand.status = 'rejected';
        cand.history.push({ at: now, status: 'rejected', note: 'duplicate of ' + dup.matchId + ' (' + dup.reason + ')' });
      } else {
        cand.status = 'in-review';
        cand.history.push({ at: now, status: 'in-review', note: 'validated and queued for review' });
      }
      const outcome = queue.upsertCandidate(q, cand, now);
      if (outcome === 'added' && !dry) {
        await commentOnIssue(repo, token, fetchImpl, issue.number, cand.status === 'rejected'
          ? 'ההצעה זוהתה ככפולה של ' + (dup ? dup.matchId : '') + ' — סטטוס: נדחתה.'
          : 'ההצעה נכנסה לתור הבדיקה כמועמד ' + cand.id + ' — סטטוס: בבדיקה. שום דבר לא מתפרסם עד אישור ידני.');
      }
    }
  }

  // 3. youtube search for the top gaps
  const budget = { maxSearches: maxSearches, used: 0 };
  let providerStatus = apiKey ? 'ok' : 'not-configured';
  for (const gap of found) {
    if (budget.used >= budget.maxSearches) break;
    const res = await yt.searchCandidates(gap, { apiKey, fetchImpl, budget, cache, now: Date.parse(now) || Date.now() });
    if (res.status === 'quota-exceeded' || res.status === 'provider-failed') { providerStatus = res.status + (res.error ? ': ' + res.error : ''); break; }
    if (res.status === 'not-configured') { providerStatus = 'not-configured'; break; }
    for (const item of res.items) {
      const dup = dedupe.findDuplicate({ youtubeId: item.youtubeId, title: item.title }, index, q);
      if (dup) continue;
      queue.upsertCandidate(q, queue.fromYouTube(item, gap, now), now);
    }
  }
  run.searches = budget.used;
  run.providerStatus = providerStatus;

  // 4. persist
  const sources = { updatedAt: now, note: 'Links and attribution only; no media is copied into this repository.',
    entries: q.candidates.map((c) => ({ id: c.id, url: c.url, creator: c.attribution.creator, license: c.attribution.license, embedOnly: true })) };
  if (!dry) {
    queue.saveQueue(root, q, now);
    queue.saveCache(root, cache);
    queue.writeJson(path.join(root, queue.SOURCES_REL), sources);
    queue.writeJson(path.join(root, 'data', 'library-agent', 'last-run.json'), Object.assign({}, run, { rejected }));
  }
  const summary = queue.summaryMarkdown(q, run);
  const summaryFile = arg('--summary-file', '');
  if (summaryFile && !dry) fs.writeFileSync(summaryFile, summary, 'utf8');
  console.log(JSON.stringify(Object.assign({ dryRun: dry, queued: q.candidates.length }, run)));
  return 0;
}

if (require.main === module) {
  main().then((code) => process.exit(code)).catch((err) => { console.error('library-agent failed:', err && err.stack ? err.stack : err); process.exit(1); });
}
module.exports = { main, manualReportFromIssue, githubIssues };
