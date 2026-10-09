/**
 * TrainerHub — מצב פיילוט לעמותת אחריי (SPEC-site-scan.md).
 *
 * ?pilot=acharai בכתובת (או קוד הפיילוט «אחריי») פותח את יכולות המאמן בחינם,
 * עם המיתוג של אחריי בשיתוף ובהדפסה, ומסמן שבבניית אימון מעדיפים את תרגילי
 * החוברת. המצב נשמר ב-localStorage בלבד — אין שרת ואין חשבון.
 *
 * משוב אחרי אימון: buildFeedback() מנקה את הקלט (בלי תגיות, בלי טלפונים ובלי
 * מיילים), saveFeedback() שומר עד 50 רשומות במכשיר, ו-exportJson() / waUrl()
 * מוציאים אותן לבעלים כקובץ JSON או כהודעת וואטסאפ שהמאמן שולח בעצמו.
 *
 * Classic script / CommonJS. Namespace: window.THPilot
 */
(function (root) {
  'use strict';

  var PILOT_KEY = 'trainerhub_pilot';
  var FEEDBACK_KEY = 'trainerhub_pilot_feedback';
  var MAX_FEEDBACK = 50;
  var PILOTS = {
    acharai: { id: 'acharai', brand: 'אחריי!', org: 'עמותת אחריי', codes: ['acharai', 'אחריי', 'אחריי!'] }
  };

  function store() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function readJson(key, fallback) {
    var s = store();
    if (!s) return fallback;
    try {
      var raw = s.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    var s = store();
    if (!s) return false;
    try { s.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  function pilotFromSearch(search) {
    var m = /[?&]pilot=([^&#]*)/i.exec(String(search || ''));
    if (!m) return null;
    var id;
    try { id = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return null; }
    return pilotFromCode(id);
  }

  function pilotFromCode(code) {
    var c = String(code == null ? '' : code).trim().toLowerCase();
    if (!c) return null;
    for (var id in PILOTS) {
      if (PILOTS[id].codes.indexOf(c) !== -1) return PILOTS[id];
    }
    return null;
  }

  function current() {
    var rec = readJson(PILOT_KEY, null);
    return rec && PILOTS[rec.id] ? PILOTS[rec.id] : null;
  }

  function isActive() {
    return !!current();
  }

  // מה שבונה האימון שואל: להעדיף את תרגילי החוברת של אחריי?
  function prefersBooklet() {
    return isActive();
  }

  // מפעיל פיילוט ונותן הרשאת מאמן. מאמן שכבר יש לו מיתוג משלו שומר אותו.
  function activate(pilot, TH) {
    if (!pilot || !PILOTS[pilot.id]) return { ok: false, error: 'קוד פיילוט לא מוכר' };
    writeJson(PILOT_KEY, { id: pilot.id, at: Date.now() });
    if (TH && typeof TH.entitlement === 'function' && typeof TH.setEntitlement === 'function') {
      var ent = TH.entitlement();
      TH.setEntitlement({ tier: 'trainer', brand: ent.brand || pilot.brand });
    }
    return { ok: true, pilot: pilot };
  }

  function redeemCode(code, TH) {
    return activate(pilotFromCode(code), TH);
  }

  function init(search, TH) {
    var pilot = pilotFromSearch(search);
    if (pilot) return activate(pilot, TH);
    return { ok: isActive(), pilot: current() };
  }

  function cleanText(value, max) {
    var s = String(value == null ? '' : value);
    var prev;
    do {
      prev = s;
      s = s.replace(/<[^>]*>/g, '');
    } while (s !== prev);
    s = s
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[מייל הוסר]')
      .replace(/\+?\d[\d\s-]{6,}\d/g, '[מספר הוסר]')
      .replace(/\s+/g, ' ')
      .trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function buildFeedback(input, now) {
    input = input || {};
    var rating = Math.round(Number(input.rating));
    if (!(rating >= 1)) rating = 0;
    if (rating > 5) rating = 5;
    var pilot = current();
    return {
      v: 1,
      pilot: pilot ? pilot.id : '',
      day: new Date(now || Date.now()).toISOString().slice(0, 10),
      rating: rating,
      worked: cleanText(input.worked, 300),
      improve: cleanText(input.improve, 300),
      session: cleanText(input.session, 80),
      site: cleanText(input.site, 120)
    };
  }

  function listFeedback() {
    var list = readJson(FEEDBACK_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveFeedback(input, now) {
    var rec = buildFeedback(input, now);
    if (!rec.rating && !rec.worked && !rec.improve) return { ok: false, error: 'המשוב ריק' };
    var list = listFeedback().concat([rec]);
    if (list.length > MAX_FEEDBACK) list = list.slice(list.length - MAX_FEEDBACK);
    writeJson(FEEDBACK_KEY, list);
    return { ok: true, feedback: rec, count: list.length };
  }

  function exportJson(list) {
    return JSON.stringify({ app: 'TrainerHub', pilot: (current() || {}).id || '', feedback: list || listFeedback() }, null, 2);
  }

  function feedbackMessage(rec) {
    rec = rec || {};
    var lines = ['משוב פיילוט TrainerHub' + (rec.pilot === 'acharai' ? ' — אחריי' : '') + ' (' + (rec.day || '') + ')'];
    if (rec.session) lines.push('אימון: ' + rec.session);
    if (rec.site) lines.push('שטח: ' + rec.site);
    if (rec.rating) lines.push('דירוג: ' + rec.rating + '/5');
    if (rec.worked) lines.push('מה עבד: ' + rec.worked);
    if (rec.improve) lines.push('מה לשפר: ' + rec.improve);
    return lines.join('\n');
  }

  // phone ריק → wa.me בלי נמען, והמאמן בוחר למי לשלוח.
  function waUrl(rec, phone) {
    var digits = String(phone == null ? '' : phone).replace(/\D/g, '');
    if (digits.charAt(0) === '0') digits = '972' + digits.slice(1);
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(feedbackMessage(rec));
  }

  var api = {
    PILOT_KEY: PILOT_KEY,
    FEEDBACK_KEY: FEEDBACK_KEY,
    MAX_FEEDBACK: MAX_FEEDBACK,
    pilotFromSearch: pilotFromSearch,
    pilotFromCode: pilotFromCode,
    current: current,
    isActive: isActive,
    prefersBooklet: prefersBooklet,
    activate: activate,
    redeemCode: redeemCode,
    init: init,
    buildFeedback: buildFeedback,
    saveFeedback: saveFeedback,
    listFeedback: listFeedback,
    exportJson: exportJson,
    feedbackMessage: feedbackMessage,
    waUrl: waUrl
  };

  root.THPilot = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else if (root.location) {
    init(root.location.search, root.TH);
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
