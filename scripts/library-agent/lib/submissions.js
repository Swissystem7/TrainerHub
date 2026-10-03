'use strict';
// Library-gap agent — user submissions ("חסר לי תרגיל / הצע סרטון").
//
// A submission arrives as a GitHub issue (opened from suggest.html with a pre-filled body, or typed by
// hand). Everything in it is UNTRUSTED DATA: it is cleaned, length-capped and validated, never executed
// and never treated as an instruction to the agent. Only YouTube and Google Drive links are accepted,
// and only with explicit consent that the link will be published.
const Infer = require('../../../js/infer.js');

const LIMITS = { title: 80, description: 600, equipment: 120, audience: 120, exercise: 80, url: 400 };
const FIELD_ALIASES = {
  url: ['קישור לסרטון', 'קישור', 'link', 'url', 'video'],
  title: ['שם התרגיל', 'שם', 'title', 'name', 'exercise name'],
  description: ['תיאור', 'תיאור התנועה', 'description'],
  equipment: ['ציוד', 'equipment'],
  audience: ['קהל יעד', 'audience', 'level', 'רמה'],
  start: ['התחלה', 'קטע זמן התחלה', 'start', 'from'],
  end: ['סיום', 'קטע זמן סיום', 'end', 'to'],
  gap: ['תרגיל חסר', 'החוסר', 'gap', 'missing exercise', 'exercise'],
  consent: ['הסכמה', 'consent', 'אישור פרסום'],
};

function clean(value, max) {
  if (value == null) return '';
  return String(value)
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/<[^>]*>/g, ' ')       // strip any HTML; submissions are text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function parseTimeSeconds(value) {
  const s = clean(value, 20);
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(':').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

function fieldKey(label) {
  const l = clean(label, 60).toLowerCase().replace(/[*:]/g, '').trim();
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => l === a.toLowerCase() || l.startsWith(a.toLowerCase()))) return key;
  }
  return null;
}

// GitHub issue forms render as "### Label\n\nvalue" blocks; suggest.html adds a fenced JSON block too.
function parseIssueBody(body) {
  const text = String(body == null ? '' : body);
  const out = {};
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      const obj = JSON.parse(fence[1]);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj)) {
          if (Object.prototype.hasOwnProperty.call(FIELD_ALIASES, k)) out[k] = v;
        }
      }
    } catch (e) { /* malformed JSON is just ignored; the headings below still count */ }
  }
  const re = /^###\s+([^\n]+)\n+([\s\S]*?)(?=^###\s|\s*$)/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = fieldKey(m[1]);
    if (!key || out[key] != null) continue;
    let v = m[2].trim();
    if (/^_no response_$/i.test(v)) v = '';
    if (key === 'consent') {
      out.consent = /\[x\]/i.test(v) || /^(כן|yes|true|מאשר|מאשרת)\b/i.test(v);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function canonicalUrl(raw) {
  const s = clean(raw, LIMITS.url);
  if (!/^https?:\/\//i.test(s)) return { error: 'not-a-url' };
  const youtubeId = Infer.parseYouTubeId(s);
  if (youtubeId) return { source: 'youtube', youtubeId, url: 'https://www.youtube.com/watch?v=' + youtubeId };
  const driveId = Infer.parseDriveId(s);
  if (driveId) return { source: 'drive', driveId, url: 'https://drive.google.com/file/d/' + driveId + '/view' };
  return { error: 'unsupported-source' };
}

function splitList(value) {
  return Infer.uniq(clean(value, LIMITS.equipment).split(/[,;،/]|\sו/).map((x) => x.trim()).filter(Boolean));
}

// Returns { ok: true, submission } or { ok: false, error, message }.
function validateSubmission(input) {
  const raw = input || {};
  const link = canonicalUrl(raw.url);
  if (link.error) {
    return { ok: false, error: link.error,
      message: link.error === 'not-a-url' ? 'צריך קישור מלא (https://...)' : 'מתקבלים רק קישורי YouTube או Google Drive' };
  }
  if (raw.consent !== true) {
    return { ok: false, error: 'consent-required', message: 'צריך לאשר שהקישור והפרטים יפורסמו במאגר' };
  }
  const title = clean(raw.title, LIMITS.title);
  if (title.length < 2) return { ok: false, error: 'missing-title', message: 'צריך שם תרגיל בעברית' };
  const proposal = Infer.proposeEntry({ url: link.url, name: title });
  if (proposal && proposal.error === 'blocked') {
    return { ok: false, error: 'blocked-name', message: proposal.message };
  }
  const startSec = parseTimeSeconds(raw.start);
  const endSec = parseTimeSeconds(raw.end);
  if (startSec != null && endSec != null && endSec <= startSec) {
    return { ok: false, error: 'bad-time-range', message: 'זמן הסיום חייב להיות אחרי זמן ההתחלה' };
  }
  const submission = {
    source: link.source,
    url: link.url,
    youtubeId: link.youtubeId || null,
    driveId: link.driveId || null,
    title,
    description: clean(raw.description, LIMITS.description),
    equipment: splitList(raw.equipment),
    audience: clean(raw.audience, LIMITS.audience),
    startSec, endSec,
    gapRef: clean(raw.gap, LIMITS.exercise) || null,
    inferred: proposal && !proposal.error ? {
      muscles: proposal.muscles || [], equipment: proposal.equipment || [], level: proposal.level || '',
      pattern: proposal.pattern || '', basis: 'exercise name only',
    } : null,
  };
  return { ok: true, submission };
}

// issue: { number, title, body, user: { login }, labels: [{name}|string], created_at, html_url }
function submissionFromIssue(issue) {
  const fields = parseIssueBody(issue && issue.body);
  if (!fields.title && issue && issue.title) fields.title = clean(issue.title, LIMITS.title).replace(/^\[[^\]]*\]\s*/, '');
  const result = validateSubmission(fields);
  const meta = {
    issueNumber: issue && issue.number != null ? Number(issue.number) : null,
    issueUrl: issue && issue.html_url ? String(issue.html_url) : null,
    submitter: issue && issue.user && issue.user.login ? String(issue.user.login) : null, // public GitHub login only
    submittedAt: issue && issue.created_at ? String(issue.created_at) : null,
  };
  return Object.assign({ meta }, result);
}

module.exports = { LIMITS, clean, parseTimeSeconds, parseIssueBody, canonicalUrl, validateSubmission, submissionFromIssue };
