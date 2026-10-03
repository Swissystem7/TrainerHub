/* TrainerHub — suggest.js
   Browser side of the library-gap agent ("חסר לי תרגיל" / "הצע סרטון").
   This file holds NO secrets and calls NO paid API. It only:
     - validates a suggestion locally (the agent validates again server-side),
     - builds a prefilled GitHub issue URL (the public, serverless submission channel),
     - builds a JSON payload the user can copy/download when they have no GitHub account,
     - reads PUBLIC data for the status panel: the review queue JSON and the public issues API.
   Everything read from the network is treated as data and escaped before rendering. */
(function (root) {
  'use strict';

  var Infer = root.THInfer || (typeof require === 'function' ? require('./infer.js') : null);

  var REPO = 'Swissystem7/TrainerHub';
  var QUEUE_BRANCH = 'library-agent/candidates';
  var QUEUE_REL = 'data/library-agent/candidates.json';
  var LIMITS = { url: 300, title: 80, description: 600, equipment: 60, audience: 60, start: 12, end: 12, gap: 80 };
  var STATUS_LABELS = { submitted: 'נשלחה', 'in-review': 'בבדיקה', approved: 'אושרה', rejected: 'נדחתה' };
  var SOURCE_LABELS = { youtube: 'יוטיוב', drive: 'Google Drive' };
  var FIELD_LABELS = {
    url: 'קישור לסרטון', source: 'מקור', title: 'שם התרגיל', description: 'תיאור', equipment: 'ציוד',
    audience: 'קהל יעד', start: 'קטע זמן — התחלה', end: 'קטע זמן — סיום', gap: 'תרגיל חסר'
  };

  function clean(value, max) {
    var s = value == null ? '' : String(value);
    s = s.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }

  // "42" -> 42 ; "0:42" -> 42 ; "1:02:03" -> 3723 ; "" -> null ; garbage -> NaN
  function parseTime(value) {
    var s = clean(value, 12);
    if (!s) return null;
    if (/^\d+$/.test(s)) return Number(s);
    var m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (!m) return NaN;
    if (m[3]) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function collect(raw) {
    raw = raw || {};
    return {
      url: clean(raw.url, LIMITS.url),
      title: clean(raw.title, LIMITS.title),
      description: clean(raw.description, LIMITS.description),
      equipment: clean(raw.equipment, LIMITS.equipment),
      audience: clean(raw.audience, LIMITS.audience),
      start: clean(raw.start, LIMITS.start),
      end: clean(raw.end, LIMITS.end),
      gap: clean(raw.gap, LIMITS.gap),
      consent: raw.consent === true || raw.consent === 'true' || raw.consent === 'on'
    };
  }

  function detect(url) {
    var yt = Infer && Infer.parseYouTubeId ? Infer.parseYouTubeId(url) : null;
    if (yt) return { source: 'youtube', id: yt, canonical: 'https://www.youtube.com/watch?v=' + yt };
    var dr = Infer && Infer.parseDriveId ? Infer.parseDriveId(url) : null;
    if (dr && /drive\.google\.com|docs\.google\.com/i.test(url)) {
      return { source: 'drive', id: dr, canonical: 'https://drive.google.com/file/d/' + dr + '/view' };
    }
    return { source: 'unknown', id: '', canonical: '' };
  }

  function validate(fields) {
    var f = collect(fields);
    var errors = [];
    var src = { source: 'unknown', id: '', canonical: '' };
    if (!f.url) {
      errors.push('צריך קישור לסרטון.');
    } else if (!/^https?:\/\//i.test(f.url)) {
      errors.push('הקישור חייב להתחיל ב-http:// או https://.');
    } else {
      src = detect(f.url);
      if (src.source === 'unknown') errors.push('רק קישורי YouTube (watch / youtu.be / shorts) או Google Drive מתקבלים.');
    }
    if (!f.title) errors.push('צריך שם תרגיל בעברית.');
    else if (Infer && Infer.isBlockedName && Infer.isBlockedName(f.title)) {
      errors.push('השם חסום — קליפים אנונימיים או שמות אישיים לא נכנסים למאגר.');
    }
    var a = parseTime(f.start);
    var b = parseTime(f.end);
    if ((f.start && isNaN(a)) || (f.end && isNaN(b))) errors.push('קטע זמן: כתבו שניות או דקות:שניות (למשל 0:42).');
    else if (a != null && b != null && b <= a) errors.push('סיום הקטע חייב להיות אחרי ההתחלה.');
    if (!f.consent) errors.push('צריך לאשר שהפרטים יפורסמו ושאין כאן סרטון פרטי או פרטים של אנשים בלי הסכמתם.');
    return {
      ok: errors.length === 0,
      errors: errors,
      fields: f,
      source: src.source,
      sourceId: src.id,
      canonicalUrl: src.canonical || f.url
    };
  }

  // GitHub issue forms are prefilled through query parameters named after the form field ids.
  // The consent checkbox cannot be prefilled — the person ticks it on GitHub, which is the point.
  function issueUrl(kind, fields, opts) {
    opts = opts || {};
    var f = collect(fields);
    var params = [];
    function add(key, value) {
      if (value) params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
    if (kind === 'gap') {
      add('template', 'exercise-gap.yml');
      add('title', '[חסר] ' + f.title);
      add('exercise', f.title);
      add('gap', f.gap);
      add('description', f.description);
      add('equipment', f.equipment);
      add('audience', f.audience);
    } else {
      add('template', 'exercise-suggestion.yml');
      add('title', '[הצעה] ' + f.title);
      add('url', f.url);
      add('exercise', f.title);
      add('description', f.description);
      add('equipment', f.equipment);
      add('audience', f.audience);
      add('start', f.start);
      add('end', f.end);
      add('gap', f.gap);
    }
    return 'https://github.com/' + (opts.repo || REPO) + '/issues/new?' + params.join('&');
  }

  // Same keys the agent's issue parser accepts inside a ```json block, so a trainer can paste it into an issue.
  function payload(fields, now) {
    var v = validate(fields);
    var f = v.fields;
    return {
      type: 'exercise-suggestion',
      version: 1,
      createdAt: now || new Date().toISOString(),
      url: v.canonicalUrl,
      source: v.source,
      title: f.title,
      description: f.description,
      equipment: f.equipment,
      audience: f.audience,
      start: f.start,
      end: f.end,
      gap: f.gap,
      consent: f.consent
    };
  }

  function issueBodyFromPayload(p) {
    return '```json\n' + JSON.stringify(p, null, 2) + '\n```\n';
  }

  // Rows for the "מה יפורסם" disclosure box: exactly what will be public.
  function previewRows(fields) {
    var v = validate(fields);
    var f = v.fields;
    var rows = [];
    if (f.url) rows.push([FIELD_LABELS.url, v.canonicalUrl]);
    if (v.source !== 'unknown') rows.push([FIELD_LABELS.source, SOURCE_LABELS[v.source] || v.source]);
    ['title', 'description', 'equipment', 'audience', 'start', 'end', 'gap'].forEach(function (k) {
      if (f[k]) rows.push([FIELD_LABELS[k], f[k]]);
    });
    return rows;
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || STATUS_LABELS.submitted;
  }

  function issueNumberOf(c) {
    var n = c.issue != null ? c.issue : (c.issueNumber != null ? c.issueNumber : (c.submission && c.submission.issue));
    if (n && typeof n === 'object') n = n.number;
    n = Number(n);
    return n > 0 ? n : null;
  }

  function normalizeIssue(it) {
    it = it || {};
    return {
      number: Number(it.number) || 0,
      title: clean(it.title, 120),
      state: it.state === 'open' ? 'open' : 'closed',
      url: typeof it.html_url === 'string' && /^https:\/\/github\.com\//.test(it.html_url) ? it.html_url : '',
      updatedAt: clean(it.updated_at, 40)
    };
  }

  // Queue candidates + public issues -> one list with the four Hebrew statuses. Queue wins over issue state.
  function mergeStatus(queue, issues) {
    var cands = queue && Array.isArray(queue.candidates) ? queue.candidates : [];
    var seenIssue = {};
    var rows = cands.map(function (c) {
      c = c || {};
      var st = STATUS_LABELS[c.status] ? c.status : 'submitted';
      var n = issueNumberOf(c);
      if (n) seenIssue[n] = true;
      var obs = c.observed || {};
      return {
        id: clean(c.id, 80),
        title: clean(obs.title || c.title || c.id, 120),
        status: st,
        label: STATUS_LABELS[st],
        source: clean(obs.url || obs.sourceUrl || '', 300),
        issue: n,
        issueUrl: (typeof c.issueUrl === 'string' && /^https:\/\/github\.com\//.test(c.issueUrl)) ? c.issueUrl
          : (n ? 'https://github.com/' + REPO + '/issues/' + n : ''),
        updatedAt: clean(c.updatedAt || c.createdAt || '', 40)
      };
    });
    (Array.isArray(issues) ? issues : []).forEach(function (raw) {
      var it = normalizeIssue(raw);
      if (!it.number || seenIssue[it.number]) return;
      seenIssue[it.number] = true;
      var st = it.state === 'open' ? 'submitted' : 'rejected';
      rows.push({
        id: 'issue-' + it.number,
        title: it.title,
        status: st,
        label: STATUS_LABELS[st] + (it.state === 'open' ? '' : ' (נסגר בלי מועמד)'),
        source: '',
        issue: it.number,
        issueUrl: it.url,
        updatedAt: it.updatedAt
      });
    });
    rows.sort(function (a, b) {
      if (a.updatedAt === b.updatedAt) return 0;
      return a.updatedAt > b.updatedAt ? -1 : 1;
    });
    return rows;
  }

  function queueUrls(opts) {
    opts = opts || {};
    return [
      'https://raw.githubusercontent.com/' + (opts.repo || REPO) + '/' + (opts.branch || QUEUE_BRANCH) + '/' + QUEUE_REL,
      opts.local || './' + QUEUE_REL
    ];
  }

  function issuesUrl(label, opts) {
    opts = opts || {};
    return 'https://api.github.com/repos/' + (opts.repo || REPO) + '/issues?state=all&per_page=30&labels=' + encodeURIComponent(label);
  }

  function fetchJson(fetchImpl, url) {
    return fetchImpl(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r || !r.ok) throw new Error('HTTP ' + (r && r.status));
      return r.json();
    });
  }

  // Queue: try the agent's branch first (live, no merge needed), then the copy on the site. Issues: public API,
  // unauthenticated (60 req/h) — failures are reported, never hidden and never faked.
  function loadStatus(fetchImpl, opts) {
    var out = { queue: null, issues: [], errors: [] };
    if (!fetchImpl && typeof root.fetch === 'function') fetchImpl = function (u, o) { return root.fetch(u, o); };
    if (!fetchImpl) { out.errors.push('no-fetch'); return Promise.resolve(out); }
    var urls = queueUrls(opts);
    function tryQueue(i) {
      if (i >= urls.length) return Promise.resolve(null);
      return fetchJson(fetchImpl, urls[i]).then(function (q) {
        return q && Array.isArray(q.candidates) ? q : tryQueue(i + 1);
      }, function () { return tryQueue(i + 1); });
    }
    var labels = ['exercise-suggestion', 'exercise-gap'];
    var jobs = [tryQueue(0)].concat(labels.map(function (label) {
      return fetchJson(fetchImpl, issuesUrl(label, opts)).then(function (list) {
        return Array.isArray(list) ? list : [];
      }, function () { out.errors.push('issues:' + label); return []; });
    }));
    return Promise.all(jobs).then(function (res) {
      out.queue = res[0];
      if (!out.queue) out.errors.push('queue');
      var seen = {};
      res.slice(1).forEach(function (list) {
        list.forEach(function (it) {
          if (!it || it.pull_request || seen[it.number]) return;
          seen[it.number] = true;
          out.issues.push(it);
        });
      });
      return out;
    });
  }

  var api = {
    REPO: REPO,
    QUEUE_BRANCH: QUEUE_BRANCH,
    LIMITS: LIMITS,
    STATUS_LABELS: STATUS_LABELS,
    FIELD_LABELS: FIELD_LABELS,
    clean: clean,
    parseTime: parseTime,
    collect: collect,
    detect: detect,
    validate: validate,
    issueUrl: issueUrl,
    payload: payload,
    issueBodyFromPayload: issueBodyFromPayload,
    previewRows: previewRows,
    statusLabel: statusLabel,
    mergeStatus: mergeStatus,
    queueUrls: queueUrls,
    issuesUrl: issuesUrl,
    loadStatus: loadStatus
  };

  root.THSuggest = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
