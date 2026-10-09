/**
 * TrainerHub — pilot mode ("אחריי"). Classic script. Namespace: window.THPilot.
 *
 * ?pilot=acharai (or the access code) turns on a free pilot for the עמותת אחריי
 * coaches: coach features unlocked without payment, Acharai branding on share
 * and print, the course booklet's drills preferred when the session builder
 * picks from the video catalog, and a one-tap feedback message to the owner.
 *
 * Everything lives in localStorage on the coach's phone. No server, no account,
 * and the feedback payload carries no trainee names or any personal data —
 * counts, ratings and the coach's own free text only.
 */
(function (root) {
  'use strict';

  // Resolved on use, not on load, so the script tags may come in any order.
  var isNode = typeof module === 'object' && module.exports;
  var nodeBooklet = isNode ? require('./booklet.js') : null;
  var nodeFeedback = isNode ? require('./feedback.js') : null;
  function Booklet() { return nodeBooklet || root.THBooklet; }
  function Feedback() { return nodeFeedback || root.THFeedback; }

  var PILOTS = {
    acharai: {
      id: 'acharai',
      he: 'אחריי',
      brand: 'עמותת אחריי',
      codes: ['acharai', 'אחריי', 'pilot-acharai'],
      preferBooklet: true
    }
  };

  var KEY = 'th.pilot';
  var MAX_NOTE = 500;

  // localStorage when the browser gives us one; a plain object in tests and in
  // private-mode browsers that throw on write. Either way nothing leaves the device.
  var memory = {};

  function readStore() {
    try {
      if (root.localStorage) {
        // A working localStorage is the only truth: an unreadable record means
        // "no pilot", not "whatever we happened to remember in this tab".
        var raw = root.localStorage.getItem(KEY);
        if (raw == null) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
      }
    } catch (e) {}
    return memory[KEY] != null ? memory[KEY] : null;
  }

  function writeStore(val) {
    memory[KEY] = val;
    try {
      if (!root.localStorage) return;
      if (val == null) root.localStorage.removeItem(KEY);
      else root.localStorage.setItem(KEY, JSON.stringify(val));
    } catch (e) {}
  }

  function fold(s) {
    return String(s == null ? '' : s).trim().toLowerCase();
  }

  /** Strip tags and cap length — the coach's note is echoed into a message and a JSON file. */
  function clean(text) {
    var s = String(text == null ? '' : text);
    var prev;
    do { prev = s; s = s.replace(/<[^>]*>/g, ''); } while (s !== prev);
    s = s.replace(/\s+/g, ' ').trim();
    return s.length > MAX_NOTE ? s.slice(0, MAX_NOTE) : s;
  }

  function pilotById(id) {
    var p = PILOTS[fold(id)];
    return p || null;
  }

  /** A pilot id from "?pilot=acharai" / "#pilot=acharai", or null. */
  function fromQuery(search) {
    var s = search;
    if (s == null) {
      var loc = root.location || {};
      s = String(loc.search || '') + String(loc.hash || '');
    }
    var m = /[?#&]pilot=([^&#\s]+)/.exec(String(s));
    if (!m) return null;
    var id = fold(decodeURIComponent(m[1]));
    return PILOTS[id] ? id : null;
  }

  /** A pilot id from an access code the coach typed, or null. */
  function fromCode(code) {
    var c = fold(code).replace(/\s+/g, '');
    var found = null;
    Object.keys(PILOTS).forEach(function (id) {
      if (PILOTS[id].codes.some(function (x) { return fold(x).replace(/\s+/g, '') === c; })) found = id;
    });
    return found;
  }

  /** Turn the pilot on and remember it, so a later visit without the link stays in. */
  function activate(id) {
    var p = pilotById(id);
    if (!p) return null;
    writeStore({ id: p.id, at: Date.now() });
    return active();
  }

  function clear() {
    writeStore(null);
    return null;
  }

  /** The active pilot ({ id, he, brand, ... }) or null. */
  function active() {
    var rec = readStore();
    var p = rec && pilotById(rec.id);
    if (!p) return null;
    return { id: p.id, he: p.he, brand: p.brand, preferBooklet: !!p.preferBooklet, at: rec.at || 0 };
  }

  /**
   * Read the URL / a code, remember what it says, and return the active pilot.
   * Called once on page load; safe to call again.
   */
  function detect(opts) {
    opts = opts || {};
    var id = fromQuery(opts.search) || (opts.code ? fromCode(opts.code) : null);
    if (id) return activate(id);
    return active();
  }

  /**
   * Pilot coaches get the coach tier for free. Overlay on TH.entitlement():
   * a real paid entitlement always wins, and the brand it already carries stays.
   */
  function entitlement(base) {
    var p = active();
    if (!p) return base || null;
    if (base && base.tier === 'trainer') return base;
    return {
      tier: 'pilot',
      canShare: true,
      canBrandedPdf: true,
      brand: (base && base.brand) || p.brand,
      pilot: p.id,
      at: p.at
    };
  }

  /** Branding line for share / print while the pilot is on. */
  function brand() {
    var p = active();
    return p ? p.brand : '';
  }

  /**
   * Builder hint: ids of catalog clips that the Acharai booklet actually teaches,
   * so buildSession() prefers them over an equally good unrelated clip.
   * Returns { prefer: [] } when no pilot is on, which changes nothing.
   */
  function builderOpts(catalog) {
    var p = active();
    var booklet = Booklet();
    if (!p || !p.preferBooklet || !booklet || typeof booklet.catalogLinks !== 'function') return { prefer: [] };
    var links;
    // catalogLinks throws until the booklet data is loaded — then there is
    // simply nothing to prefer yet, which must not break the build.
    try { links = booklet.catalogLinks(catalog); } catch (e) { return { prefer: [] }; }
    var seen = {};
    var prefer = [];
    (links.linked || []).forEach(function (x) {
      if (x && x.id && !seen[x.id]) { seen[x.id] = true; prefer.push(x.id); }
    });
    return { prefer: prefer };
  }

  /**
   * What the owner gets back after a session. No trainee names, no ids —
   * the pilot, the date, how many trainees, what was built, a 1-5 rating and a note.
   */
  function feedbackPayload(input) {
    input = input || {};
    var p = active();
    var rating = Math.round(Number(input.rating));
    var group = Math.round(Number(input.group));
    var out = {
      app: 'TrainerHub',
      pilot: p ? p.id : '',
      date: clean(input.date) || new Date().toISOString().slice(0, 10),
      group: isFinite(group) && group > 0 ? group : null,
      site: clean(input.site),
      method: clean(input.method),
      rating: isFinite(rating) ? Math.max(1, Math.min(5, rating)) : null,
      worked: clean(input.worked),
      note: clean(input.note)
    };
    return out;
  }

  function feedbackJson(payload) {
    return JSON.stringify(payload || feedbackPayload(), null, 2);
  }

  /** One short Hebrew message, for WhatsApp or for pasting anywhere. */
  function feedbackText(payload) {
    var f = payload || feedbackPayload();
    var named = pilotById(f.pilot);
    var lines = ['משוב TrainerHub' + (named ? ' · פילוט ' + named.he : '')];
    lines.push('תאריך: ' + f.date);
    if (f.group) lines.push('מתאמנים: ' + f.group);
    if (f.site) lines.push('שטח: ' + f.site);
    if (f.method) lines.push('שיטה: ' + f.method);
    if (f.rating) lines.push('דירוג: ' + f.rating + '/5');
    if (f.worked) lines.push('מה עבד: ' + f.worked);
    if (f.note) lines.push('הערה: ' + f.note);
    return lines.join('\n');
  }

  /**
   * Where the feedback goes. window.TH_PILOT_FEEDBACK_WA (the owner's number)
   * makes it a wa.me message; without it we fall back to the public feedback
   * form, which is the channel that exists today. Nothing is sent automatically.
   */
  function feedbackUrl(payload) {
    var digits = String(root.TH_PILOT_FEEDBACK_WA || '').replace(/\D/g, '');
    if (digits) return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(feedbackText(payload));
    var form = Feedback();
    return form && typeof form.feedbackUrl === 'function' ? form.feedbackUrl() : '';
  }

  var api = {
    PILOTS: PILOTS,
    KEY: KEY,
    fromQuery: fromQuery,
    fromCode: fromCode,
    detect: detect,
    activate: activate,
    active: active,
    clear: clear,
    entitlement: entitlement,
    brand: brand,
    builderOpts: builderOpts,
    feedbackPayload: feedbackPayload,
    feedbackJson: feedbackJson,
    feedbackText: feedbackText,
    feedbackUrl: feedbackUrl
  };

  root.THPilot = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
