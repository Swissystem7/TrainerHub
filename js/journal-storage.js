/**
 * TrainerHub — local training journal (volume, PRs, progress graph).
 * Classic script / CommonJS. Namespace: window.THJournalStorage
 */
(function (root) {
  'use strict';

  var Analyzer = root.THAnalyzer;

  function getTH() {
    var th = root.TH;
    if (th && th.store) return th;
    if (typeof module === 'object' && module.exports) {
      try { return require('./core.js'); } catch (e) { return th; }
    }
    return th;
  }

  function getAnalyzer() {
    if (Analyzer && typeof Analyzer.enrichJournalEntry === 'function') return Analyzer;
    if (typeof module === 'object' && module.exports) {
      try { return require('./analyzer.js'); } catch (e) {}
    }
    return Analyzer;
  }

  function emptyStore() {
    return { entries: [], personalRecords: {} };
  }

  function loadStore() {
    var TH = getTH();
    var raw = TH.store.get(TH.KEYS.journal, null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyStore();
    return {
      entries: Array.isArray(raw.entries) ? raw.entries.slice() : [],
      personalRecords: raw.personalRecords && typeof raw.personalRecords === 'object'
        ? Object.assign({}, raw.personalRecords)
        : {}
    };
  }

  function persistStore(data) {
    var TH = getTH();
    return TH.store.set(TH.KEYS.journal, {
      entries: (data.entries || []).slice(),
      personalRecords: Object.assign({}, data.personalRecords || {})
    });
  }

  function normalizeSet(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      exerciseId: String(raw.exerciseId || raw.id || '').trim(),
      reps: Number(raw.reps),
      weightKg: Number(raw.weightKg)
    };
  }

  function normalizeEntry(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var sets = Array.isArray(raw.sets) ? raw.sets.map(normalizeSet) : [];
    return {
      id: String(raw.id || '').trim(),
      doneAt: String(raw.doneAt || raw.at || new Date().toISOString()),
      title: String(raw.title || 'אימון').trim() || 'אימון',
      clientId: String(raw.clientId || '').trim(),
      sets: sets
    };
  }

  function computeVolume(sets) {
    return getTH().workoutVolume(sets);
  }

  function isBetterPr(prev, next) {
    if (!prev) return true;
    if (next.weightKg > prev.weightKg) return true;
    if (next.weightKg === prev.weightKg && next.reps > prev.reps) return true;
    return false;
  }

  function applyPersonalRecords(store, entry) {
    var prs = store.personalRecords || {};
    (entry.sets || []).forEach(function (set) {
      if (!set.exerciseId) return;
      if (!(set.reps > 0) || !(set.weightKg > 0)) return;
      var candidate = {
        exerciseId: set.exerciseId,
        reps: set.reps,
        weightKg: set.weightKg,
        tonnage: Math.round(set.reps * set.weightKg * 10) / 10,
        doneAt: entry.doneAt
      };
      var prev = prs[set.exerciseId];
      if (isBetterPr(prev, candidate)) prs[set.exerciseId] = candidate;
    });
    store.personalRecords = prs;
  }

  function buildProgressGraph(entries) {
    entries = entries || [];
    var byDay = {};
    entries.forEach(function (entry) {
      var day = String(entry.doneAt || '').slice(0, 10);
      if (!day) return;
      var vol = Number(entry.volume);
      if (!isFinite(vol)) vol = computeVolume(entry.sets || []);
      byDay[day] = (byDay[day] || 0) + vol;
    });
    return Object.keys(byDay).sort().map(function (day) {
      return { date: day, volume: Math.round(byDay[day] * 10) / 10 };
    });
  }

  function saveEntry(raw) {
    var entry = normalizeEntry(raw);
    if (!entry.id) entry.id = 'j_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    entry.volume = computeVolume(entry.sets);
    var analyzer = getAnalyzer();
    if (analyzer && typeof analyzer.enrichJournalEntry === 'function') {
      entry = analyzer.enrichJournalEntry(entry);
    }
    var store = loadStore();
    store.entries.push({
      id: entry.id,
      doneAt: entry.doneAt,
      title: entry.title,
      clientId: entry.clientId || undefined,
      sets: entry.sets.map(function (s) {
        return { exerciseId: s.exerciseId, reps: s.reps, weightKg: s.weightKg };
      }),
      volume: entry.volume
    });
    applyPersonalRecords(store, entry);
    if (!persistStore(store)) return null;
    return {
      id: entry.id,
      doneAt: entry.doneAt,
      title: entry.title,
      sets: entry.sets.slice(),
      volume: entry.volume,
      personalRecords: Object.assign({}, store.personalRecords),
      progressGraph: buildProgressGraph(store.entries)
    };
  }

  function listEntries() {
    return loadStore().entries.slice().sort(function (a, b) {
      return String(a.doneAt || '').localeCompare(String(b.doneAt || ''));
    });
  }

  function getPersonalRecords() {
    return Object.assign({}, loadStore().personalRecords);
  }

  function getJournalSnapshot() {
    var store = loadStore();
    var entries = listEntries();
    return {
      entries: entries,
      personalRecords: Object.assign({}, store.personalRecords),
      progressGraph: buildProgressGraph(entries)
    };
  }

  /** Entries, PRs and volume graph for one client (entries saved with clientId). */
  function getClientSnapshot(clientId) {
    var id = String(clientId || '');
    var entries = listEntries().filter(function (e) { return id && e.clientId === id; });
    var tmp = { personalRecords: {} };
    entries.forEach(function (e) { applyPersonalRecords(tmp, e); });
    return { entries: entries, personalRecords: tmp.personalRecords, progressGraph: buildProgressGraph(entries) };
  }

  // ---- Insights: pure aggregation + dependency-free SVG (used by journal.html) ----
  function localDay(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function logDays(logs) {
    var set = {};
    (logs || []).forEach(function (l) {
      var d = new Date(l && (l.at || l.doneAt));
      if (!isNaN(d.getTime())) set[localDay(d)] = (set[localDay(d)] || 0) + 1;
    });
    return set;
  }

  /** Last `weeks` calendar weeks (Sunday start) ending with the week of `now`: [{ start, days:[{date,count,future}] }]. */
  function heatmapWeeks(logs, weeks, now) {
    var counts = logDays(logs);
    now = now ? new Date(now) : new Date();
    now.setHours(12, 0, 0, 0);
    var start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - (weeks - 1) * 7);
    var out = [];
    for (var w = 0; w < weeks; w++) {
      var days = [];
      for (var d = 0; d < 7; d++) {
        var cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + d);
        var key = localDay(cur);
        days.push({ date: key, count: counts[key] || 0, future: cur > now });
      }
      out.push({ start: days[0].date, days: days });
    }
    return out;
  }

  /** Sessions per week vs target (days per week, default 3). */
  function weeklyAdherence(logs, weeks, target, now) {
    var t = target > 0 ? target : 3;
    return heatmapWeeks(logs, weeks, now).map(function (wk) {
      var n = wk.days.filter(function (d) { return d.count > 0; }).length;
      return { week: wk.start, sessions: n, target: t, pct: Math.min(100, Math.round(n / t * 100)) };
    });
  }

  function escXml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function emptySvg(label, msg) {
    return '<p class="honest" role="note">' + escXml(label) + ': ' + escXml(msg) + '</p>';
  }

  /** points: [{ label, value }] → accessible bar chart. */
  function barChartSvg(points, opts) {
    opts = opts || {};
    var label = opts.label || 'גרף';
    if (!points || !points.length || !points.some(function (p) { return p.value > 0; })) return emptySvg(label, opts.empty || 'אין עדיין נתונים');
    var W = 320, H = 140, pad = 18;
    var max = opts.max || Math.max.apply(null, points.map(function (p) { return p.value; })) || 1;
    var bw = (W - pad * 2) / points.length;
    var bars = points.map(function (p, i) {
      var h = Math.max(0, Math.round((p.value / max) * (H - pad * 2)));
      return '<rect x="' + (pad + i * bw + 2).toFixed(1) + '" y="' + (H - pad - h) + '" width="' + Math.max(1, bw - 4).toFixed(1) +
        '" height="' + h + '" fill="currentColor" opacity="0.8"><title>' + escXml(p.label + ': ' + p.value + (opts.unit || '')) + '</title></rect>';
    }).join('');
    return '<svg role="img" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" aria-label="' + escXml(label) + '">' +
      '<title>' + escXml(label) + '</title>' +
      '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="currentColor" opacity="0.4"/>' + bars +
      '<text direction="ltr" x="' + pad + '" y="12" font-size="10" fill="currentColor">' + escXml(String(max) + (opts.unit || '')) + '</text></svg>';
  }

  /** points: [{ label, value }] → accessible line chart (needs 2+ points). */
  function lineChartSvg(points, opts) {
    opts = opts || {};
    var label = opts.label || 'גרף';
    points = (points || []).filter(function (p) { return typeof p.value === 'number' && isFinite(p.value); });
    if (points.length < 2) return emptySvg(label, opts.empty || 'צריך לפחות 2 מדידות');
    var W = 320, H = 140, pad = 18;
    var vals = points.map(function (p) { return p.value; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var xy = points.map(function (p, i) {
      return [pad + i * (W - pad * 2) / (points.length - 1), H - pad - (p.value - min) / span * (H - pad * 2)];
    });
    var path = xy.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    var dots = xy.map(function (q, i) {
      return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3" fill="currentColor"><title>' +
        escXml(points[i].label + ': ' + points[i].value + (opts.unit || '')) + '</title></circle>';
    }).join('');
    return '<svg role="img" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" aria-label="' + escXml(label) + '">' +
      '<title>' + escXml(label) + '</title><path d="' + path + '" fill="none" stroke="currentColor" stroke-width="2"/>' + dots +
      '<text direction="ltr" x="' + pad + '" y="12" font-size="10" fill="currentColor">' + escXml(max + (opts.unit || '')) + '</text>' +
      '<text direction="ltr" x="' + pad + '" y="' + (H - 4) + '" font-size="10" fill="currentColor">' + escXml(min + (opts.unit || '')) + '</text></svg>';
  }

  /** GitHub-style calendar heatmap from heatmapWeeks(). */
  function heatmapSvg(weeks, opts) {
    opts = opts || {};
    var label = opts.label || 'מפת חום של ימי אימון';
    var cell = 14, gap = 3, W = weeks.length * (cell + gap) + gap, H = 7 * (cell + gap) + gap;
    var total = 0;
    var rects = weeks.map(function (wk, w) {
      return wk.days.map(function (d, i) {
        if (d.future) return '';
        total += d.count > 0 ? 1 : 0;
        // Oldest week on the left, current week on the right edge.
        var x = W - gap - (weeks.length - w) * (cell + gap) + gap;
        return '<rect x="' + x + '" y="' + (gap + i * (cell + gap)) + '" width="' + cell + '" height="' + cell + '" rx="2" fill="currentColor" opacity="' +
          (d.count > 0 ? Math.min(1, 0.45 + d.count * 0.25) : 0.12) + '" data-date="' + d.date + '"><title>' +
          escXml(d.date + (d.count ? ' · ' + d.count + ' אימונים' : ' · בלי אימון')) + '</title></rect>';
      }).join('');
    }).join('');
    return '<svg role="img" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" aria-label="' + escXml(label + ' — ' + total + ' ימים עם אימון') + '">' +
      '<title>' + escXml(label) + '</title>' + rects + '</svg>';
  }

  function clearJournal() {
    return persistStore(emptyStore());
  }

  var api = {
    normalizeEntry: normalizeEntry,
    computeVolume: computeVolume,
    buildProgressGraph: buildProgressGraph,
    saveEntry: saveEntry,
    listEntries: listEntries,
    getPersonalRecords: getPersonalRecords,
    getJournalSnapshot: getJournalSnapshot,
    clearJournal: clearJournal,
    getClientSnapshot: getClientSnapshot,
    heatmapWeeks: heatmapWeeks,
    weeklyAdherence: weeklyAdherence,
    barChartSvg: barChartSvg,
    lineChartSvg: lineChartSvg,
    heatmapSvg: heatmapSvg
  };

  root.THJournalStorage = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
