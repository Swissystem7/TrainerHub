/**
 * TrainerHub shared core — classic script, no bundler.
 * Loaded by the weekly builder, Creator Studio, and workout-mode.
 * Namespace: window.TH  (ThLink kept as an alias).
 */
(function (root) {
  'use strict';

  var SessionTracker = root.THSessionTracker;
  if (!SessionTracker && typeof module === 'object' && module.exports) {
    SessionTracker = require('./session-tracker.js');
  }

  var KEYS = {
    active: 'trainerhub_active_workout',
    activeSession: 'trainerhub_active_session',
    saved: 'trainerhub_workouts',
    clients: 'trainerhub_clients',
    user: 'trainerhub_user',
    draft: 'trainerhub_draft_workout',
    userCatalog: 'trainerhub_user_catalog',
    wishlist: 'trainerhub_film_wishlist',
    patterns: 'trainerhub_ingest_patterns',
    access: 'trainerhub_content_access',
    print: 'trainerhub_print_workout',
    clientProfiles: 'trainerhub_client_profiles',
    journal: 'trainerhub_journal_entries',
    workoutPrefs: 'trainerhub_workout_prefs'
  };

  // Hash of the trainer access code (sent after payment) — product boundary
  // on a static demo, not security. The code itself is not written in any file of
  // this repo (tests included). Replaced 28.9.2026: the earlier code leaked and is revoked.
  var ACCESS_HASH = 2847391056;

  var PHASE_LABELS = { 'Warm-up': 'חימום', 'Main': 'עיקר', 'Cool-down': 'שחרור' };
  var BODY_PARTS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];
  var GOAL_RX = {
    strength: { sets: 4, reps: '4-6', rest: 120, hold: 30 },
    hypertrophy: { sets: 3, reps: '8-12', rest: 60, hold: 40 },
    endurance: { sets: 3, reps: '12-15', rest: 45, hold: 45 }
  };
  // Static holds are prescribed in seconds, not reps: «פלאנק · 12-15 חזרות» means nothing
  // to the trainee, and workout-mode counts a timed step down instead of waiting for reps.
  // «מטפס הרים עם פלאנק» moves, so only a name that starts with the hold counts.
  var HOLD_IDS = { plank: true, wall_sit: true };
  function isHoldExercise(id) {
    var key = String(id || '');
    return !!HOLD_IDS[key] || /^פלאנק/.test(key);
  }
  var SPLIT_MUSCLES = {
    push: ['chest', 'shoulders', 'triceps'],
    pull: ['back', 'biceps'],
    legs: ['legs'],
    upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    lower: ['legs', 'core'],
    full: ['chest', 'back', 'shoulders', 'legs', 'core']
  };
  var WARM_UPS = ['arm_circles', 'leg_swings', 'torso_twists', 'jumping_jacks', 'hip_circles'];
  var COOL_DOWNS = ['hamstring_stretch', 'quad_stretch', 'shoulder_stretch', 'cat_cow', 'child_pose'];
  var PROGRAM_POOL = [
    { id: 'bodyweight_squat', muscles: ['legs'], equipment: ['none'] },
    { id: 'lunges', muscles: ['legs'], equipment: ['none', 'dumbbells'] },
    { id: 'glute_bridge', muscles: ['legs'], equipment: ['none'] },
    { id: 'step_up', muscles: ['legs'], equipment: ['none', 'dumbbells'] },
    { id: 'wall_sit', muscles: ['legs'], equipment: ['none'] },
    { id: 'calf_raise', muscles: ['legs'], equipment: ['none', 'dumbbells'] },
    { id: 'goblet_squat', muscles: ['legs'], equipment: ['dumbbells'] },
    { id: 'dumbbell_lunge', muscles: ['legs'], equipment: ['dumbbells'] },
    { id: 'romanian_deadlift_db', muscles: ['legs'], equipment: ['dumbbells'] },
    { id: 'squat', muscles: ['legs'], equipment: ['barbell'] },
    { id: 'deadlift', muscles: ['legs', 'back'], equipment: ['barbell'] },
    { id: 'leg_press', muscles: ['legs'], equipment: ['machine'] },
    { id: 'push_up', muscles: ['chest'], equipment: ['none'] },
    { id: 'wide_push_up', muscles: ['chest'], equipment: ['none'] },
    { id: 'dumbbell_bench', muscles: ['chest'], equipment: ['dumbbells'] },
    { id: 'dumbbell_fly', muscles: ['chest'], equipment: ['dumbbells'] },
    { id: 'bench_press', muscles: ['chest'], equipment: ['barbell'] },
    { id: 'superman', muscles: ['back'], equipment: ['none'] },
    { id: 'bodyweight_row', muscles: ['back'], equipment: ['none'] },
    { id: 'dumbbell_row', muscles: ['back'], equipment: ['dumbbells'] },
    { id: 'barbell_row', muscles: ['back'], equipment: ['barbell'] },
    { id: 'pull_up', muscles: ['back'], equipment: ['bar'] },
    { id: 'lat_pulldown', muscles: ['back'], equipment: ['machine'] },
    { id: 'pike_push_up', muscles: ['shoulders'], equipment: ['none'] },
    { id: 'arm_circles', muscles: ['shoulders'], equipment: ['none'] },
    { id: 'dumbbell_ohp', muscles: ['shoulders'], equipment: ['dumbbells'] },
    { id: 'lateral_raise', muscles: ['shoulders'], equipment: ['dumbbells'] },
    { id: 'overhead_press', muscles: ['shoulders'], equipment: ['barbell'] },
    { id: 'bodyweight_curl', muscles: ['biceps'], equipment: ['none'] },
    { id: 'bicep_curl', muscles: ['biceps'], equipment: ['dumbbells'] },
    { id: 'hammer_curl', muscles: ['biceps'], equipment: ['dumbbells'] },
    { id: 'bench_dips', muscles: ['triceps'], equipment: ['none'] },
    { id: 'tricep_push_up', muscles: ['triceps'], equipment: ['none'] },
    { id: 'overhead_extension', muscles: ['triceps'], equipment: ['dumbbells'] },
    { id: 'tricep_pushdown', muscles: ['triceps'], equipment: ['machine'] },
    { id: 'plank', muscles: ['core'], equipment: ['none'] },
    { id: 'crunches', muscles: ['core'], equipment: ['none'] },
    { id: 'russian_twist', muscles: ['core'], equipment: ['none', 'dumbbells'] },
    { id: 'leg_raise', muscles: ['core'], equipment: ['none'] },
    { id: 'mountain_climber', muscles: ['core'], equipment: ['none'] }
  ];
  var HE_NAMES = {
    bodyweight_squat: 'סקוואט משקל גוף',
    lunges: 'מכרעים',
    glute_bridge: 'גשר ישבן',
    step_up: 'עליית מדרגה',
    wall_sit: 'ישיבה על קיר',
    calf_raise: 'עליות שוק',
    goblet_squat: 'סקוואט גביע',
    dumbbell_lunge: 'מכרע משקולות',
    romanian_deadlift_db: 'דדליפט רומני משקולות',
    dumbbell_step_up: 'עליית מדרגה עם משקולות',
    squat: 'סקוואט',
    deadlift: 'דדליפט',
    leg_press: 'לחיצת רגליים',
    push_up: 'שכיבות סמיכה',
    wide_push_up: 'שכיבות רחבות',
    decline_push_up: 'שכיבות שיפוע',
    dumbbell_bench: 'לחיצת חזה משקולות',
    dumbbell_fly: 'פרפר משקולות',
    dumbbell_incline: 'לחיצה בשיפוע משקולות',
    bench_press: 'לחיצת חזה',
    incline_press: 'לחיצה בשיפוע',
    superman: 'סופרמן',
    bodyweight_row: 'חתירת משקל גוף',
    reverse_fly_bw: 'פרפר הפוך משקל גוף',
    dumbbell_row: 'חתירת משקולת',
    reverse_fly: 'פרפר הפוך',
    barbell_row: 'חתירה',
    pull_up: 'מתח',
    lat_pulldown: 'פולי עליון',
    pike_push_up: 'שכיבות פאייק',
    arm_circles: 'מעגלי ידיים',
    wall_walk: 'הליכה על קיר',
    dumbbell_ohp: 'לחיצת כתפיים משקולות',
    lateral_raise: 'הרחקה צידית',
    front_raise: 'הרמה קדמית',
    overhead_press: 'לחיצת כתפיים',
    upright_row: 'חתירה אנכית',
    bodyweight_curl: 'כפיפת משקל גוף',
    doorway_curl: 'כפיפה במשקוף',
    bicep_curl: 'כפיפת מרפק',
    hammer_curl: 'פטישים',
    concentration_curl: 'כפיפה מרוכזת',
    bench_dips: 'דיפס על ספסל',
    tricep_push_up: 'שכיבות טרייספס',
    overhead_extension: 'פשיטה מעל הראש',
    tricep_kickback: 'בעיטת טרייספס',
    tricep_pushdown: 'פשיטת מרפק',
    dips: 'מקבילים',
    plank: 'פלאנק',
    crunches: 'כפיפות בטן',
    russian_twist: 'טוויסט רוסי',
    leg_raise: 'הרמת רגליים',
    mountain_climber: 'מטפס הרים',
    jumping_jacks: 'ג׳אמפינג ג׳קס',
    leg_swings: 'נדנוד רגליים',
    torso_twists: 'סיבובי גו',
    hip_circles: 'מעגלי ירך',
    hamstring_stretch: 'מתיחת מיתר',
    quad_stretch: 'מתיחת ארבע ראשי',
    shoulder_stretch: 'מתיחת כתף',
    cat_cow: 'חתול-פרה',
    child_pose: 'מנח הילד'
  };

  var MUSCLE_LABELS = {
    chest: 'חזה',
    back: 'גב',
    shoulders: 'כתפיים',
    biceps: 'דו־ראשי',
    triceps: 'תלת־ראשי',
    legs: 'רגליים',
    core: 'ליבה'
  };
  var EQ_LABELS = {
    none: 'משקל גוף',
    dumbbells: 'משקולות',
    kettlebell: 'קטלבל',
    barbell: 'מוט',
    machine: 'מכונה',
    bar: 'מתח',
    band: 'גומיות',
    cones: 'קונוסים',
    ball: 'כדור',
    basketball: 'כדורסל',
    football: 'כדורגל',
    'tennis-ball': 'כדור טניס',
    wall: 'קיר',
    hoop: 'חישוק',
    stairs: 'מדרגות',
    ladder: 'סולם'
  };
  var TAG_LABELS = {
    kids: 'ילדים',
    partner: 'זוגות',
    sport: 'ספורט',
    band: 'גומיות',
    cones: 'קונוסים'
  };
  var NAME_ALIASES = {
    'מאונטיין קליימר': 'mountain_climber',
    'mountain climber': 'mountain_climber',
    'פלאנק': 'plank',
    'פלאנק ברכיים': 'פלאנק_ברכיים',
    'כפיפות בטן': 'crunches',
    'בטן': 'crunches',
    'מתח אוסטרלי': 'bodyweight_row',
    'חימום': 'warmup',
    'מדרגות': 'step_up',
    'סופרמן': 'superman',
    'גב תחתון': 'superman',
    'מטפס הרים': 'mountain_climber',
    'שכיבות סמיכה': 'אתגר_שכיבות_שמיכה',
    'שכיבות שמיכה': 'אתגר_שכיבות_שמיכה',
    'שכיבת שמיכה': 'אתגר_שכיבות_שמיכה',
    'שכיבת סמיכה': 'אתגר_שכיבות_שמיכה',
    'שכיבות': 'אתגר_שכיבות_שמיכה',
    'פלנק': 'plank',
    'plank': 'plank',
    'סייד פלאנק': 'פלאנק_צידי',
    'פלאנק צד': 'פלאנק_צידי',
    'פוש אפ': 'אתגר_שכיבות_שמיכה',
    'פושאפ': 'אתגר_שכיבות_שמיכה',
    'push up': 'אתגר_שכיבות_שמיכה',
    'pushups': 'אתגר_שכיבות_שמיכה',
    'push ups': 'אתגר_שכיבות_שמיכה'
  };

  var SOURCE_LABELS = {
    drive: 'דרייב',
    local: 'מקומי',
    youtube: 'יוטיוב',
    link: 'קישור חיצוני'
  };

  var catalog = {};
  var catalogReady = false;
  var readyWaiters = [];

  // Stated length wins; a pasted workout has none, so show the analyzer's
  // estimate marked as such, and never an empty "זמן:  דקות".
  function durationLabel(minutes, estimate) {
    var m = Number(minutes);
    if (m > 0) return m === 1 ? 'דקה' : m + ' דקות';
    var e = Number(estimate);
    if (e > 0) return Math.round(e) <= 1 ? 'כדקה (הערכה)' : 'כ־' + Math.round(e) + ' דקות (הערכה)';
    return 'לא צוין';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function storeGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storeSet(key, val) {
    try {
      var serialized = JSON.stringify(val);
      localStorage.setItem(key, serialized);
      return localStorage.getItem(key) === serialized;
    } catch (e) { return false; }
  }

  function storeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // ---- Client details + measurements (extends the existing trainerhub_clients record) ----
  var CLIENT_GOALS = { strength: 'כוח', hypertrophy: 'מסת שריר', endurance: 'סיבולת', weight_loss: 'ירידה במשקל', health: 'בריאות כללית', sport: 'ספורט' };
  var CLIENT_LEVELS = { beginner: 'מתחיל', intermediate: 'בינוני', advanced: 'מתקדם' };
  var WEEKDAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

  function numOrNull(v) {
    if (v === '' || v == null) return null;
    var n = Number(String(v).replace(',', '.'));
    return isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
  }

  function normalizeClientDetails(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var days = Array.isArray(raw.days) ? raw.days : [];
    days = days.map(Number).filter(function (d, i, a) { return d >= 0 && d <= 6 && d === Math.floor(d) && a.indexOf(d) === i; }).sort();
    return {
      nickname: String(raw.nickname || '').trim().slice(0, 40),
      goal: CLIENT_GOALS[raw.goal] ? raw.goal : '',
      level: CLIENT_LEVELS[raw.level] ? raw.level : '',
      days: days,
      measurements: (Array.isArray(raw.measurements) ? raw.measurements : []).map(normalizeMeasurement).filter(Boolean)
    };
  }

  function normalizeMeasurement(m) {
    m = m && typeof m === 'object' ? m : {};
    var out = { at: String(m.at || '').slice(0, 10), weightKg: numOrNull(m.weightKg), waistCm: numOrNull(m.waistCm), note: String(m.note || '').trim().slice(0, 120) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.at)) return null;
    if (out.weightKg == null && out.waistCm == null && !out.note) return null;
    return out;
  }

  /** Writes goal/level/days/nickname onto the client object in place (other fields untouched). */
  function setClientDetails(client, details) {
    if (!client || typeof client !== 'object') return client;
    var d = normalizeClientDetails(Object.assign({}, normalizeClientDetails(client), details || {}, { measurements: client.measurements }));
    client.nickname = d.nickname;
    client.goal = d.goal;
    client.level = d.level;
    client.days = d.days;
    client.measurements = d.measurements;
    return client;
  }

  /** Adds a measurement (newest last); same date replaces the earlier one of that day. */
  function addMeasurement(client, m) {
    if (!client || typeof client !== 'object') return null;
    var now = new Date();
    var today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var item = normalizeMeasurement(Object.assign({ at: today }, m || {}));
    if (!item) return null;
    var list = normalizeClientDetails(client).measurements.filter(function (x) { return x.at !== item.at; });
    list.push(item);
    list.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
    client.measurements = list;
    return item;
  }

  function clientDetailsText(client) {
    var d = normalizeClientDetails(client);
    var parts = [];
    if (d.goal) parts.push('מטרה: ' + CLIENT_GOALS[d.goal]);
    if (d.level) parts.push('רמה: ' + CLIENT_LEVELS[d.level]);
    if (d.days.length) parts.push('ימים: ' + d.days.map(function (x) { return WEEKDAYS_HE[x]; }).join(' '));
    var m = d.measurements[d.measurements.length - 1];
    if (m) parts.push('מדידה אחרונה ' + m.at + (m.weightKg != null ? ' · ' + m.weightKg + ' ק״ג' : '') + (m.waistCm != null ? ' · מותן ' + m.waistCm + ' ס״מ' : ''));
    return parts.join(' · ');
  }

  // ---- Password-encrypted backup/restore of every TrainerHub localStorage key (WebCrypto, no server) ----
  var BACKUP_FORMAT = 'trainerhub-backup';
  var BACKUP_ITER = 210000;

  function subtle() {
    var c = (root.crypto && root.crypto.subtle) ? root.crypto : null;
    if (!c && typeof require === 'function') { try { c = require('crypto').webcrypto; } catch (e) {} }
    if (!c || !c.subtle) throw new Error('הדפדפן לא תומך בהצפנה (WebCrypto).');
    return c;
  }

  function bytesToB64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
  }

  function b64ToBytes(b64) {
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function backupKeyNames() {
    var names = Object.keys(KEYS).map(function (k) { return KEYS[k]; });
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('trainerhub_') === 0 && names.indexOf(k) === -1) names.push(k);
      }
    } catch (e) {}
    return names;
  }

  /** Snapshot of all TrainerHub keys as raw strings (only keys that exist). */
  function collectBackup() {
    var data = {};
    backupKeyNames().forEach(function (k) {
      try {
        var v = localStorage.getItem(k);
        if (v != null) data[k] = v;
      } catch (e) {}
    });
    return data;
  }

  function deriveKey(password, salt, usage) {
    var c = subtle();
    return c.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return c.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: BACKUP_ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, [usage]);
      });
  }

  /** Resolves to the JSON text of an encrypted backup file. */
  function encryptBackup(password, data) {
    if (!password || String(password).length < 6) return Promise.reject(new Error('סיסמה של 6 תווים לפחות.'));
    var c;
    try { c = subtle(); } catch (e) { return Promise.reject(e); }
    var payload = data || collectBackup();
    var salt = c.getRandomValues(new Uint8Array(16));
    var iv = c.getRandomValues(new Uint8Array(12));
    return deriveKey(password, salt, 'encrypt').then(function (key) {
      return c.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
    }).then(function (buf) {
      return JSON.stringify({
        format: BACKUP_FORMAT, v: 1, createdAt: new Date().toISOString(), keys: Object.keys(payload).length,
        kdf: 'PBKDF2-SHA256', iter: BACKUP_ITER, cipher: 'AES-GCM-256',
        salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(buf))
      });
    });
  }

  /** Resolves to { key: rawString } or rejects with a Hebrew message. */
  function decryptBackup(text, password) {
    var file;
    try { file = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return Promise.reject(new Error('הקובץ אינו גיבוי של TrainerHub.')); }
    if (!file || file.format !== BACKUP_FORMAT || !file.data) return Promise.reject(new Error('הקובץ אינו גיבוי של TrainerHub.'));
    var c;
    try { c = subtle(); } catch (e) { return Promise.reject(e); }
    return deriveKey(password, b64ToBytes(file.salt), 'decrypt').then(function (key) {
      return c.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(file.iv) }, key, b64ToBytes(file.data));
    }).then(function (buf) {
      var data = JSON.parse(new TextDecoder().decode(buf));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad');
      return data;
    }, function () { throw new Error('סיסמה שגויה או קובץ פגום.'); });
  }

  /** Writes restored keys back. Keys not in the backup are left as they are (nothing is deleted). */
  function restoreBackup(data) {
    var restored = 0;
    Object.keys(data || {}).forEach(function (k) {
      if (k.indexOf('trainerhub_') !== 0 || typeof data[k] !== 'string') return;
      try { localStorage.setItem(k, data[k]); restored++; } catch (e) {}
    });
    return restored;
  }

  // ---- Workout-mode cues: per-set logging helpers, rest-end vibration/sound, Hebrew TTS (all offline, no network) ----
  /** First whole number in a reps value ("8-10" → 8, "12" → 12, "עד כשל" → null). */
  function parseRepsNumber(reps) {
    var m = String(reps == null ? '' : reps).match(/\d+/);
    var n = m ? Number(m[0]) : NaN;
    return n > 0 && n < 1000 ? n : null;
  }

  function workoutPrefs() {
    var p = storeGet(KEYS.workoutPrefs, null);
    p = p && typeof p === 'object' ? p : {};
    return { tts: p.tts !== false, sound: p.sound !== false };
  }

  function setWorkoutPrefs(patch) {
    var next = Object.assign(workoutPrefs(), patch || {});
    storeSet(KEYS.workoutPrefs, next);
    return next;
  }

  /** Text spoken at the start of a rest: "מנוחה 60 שניות. הבא: סקוואט, 10 חזרות". */
  function nextExerciseSpeech(step) {
    if (!step) return '';
    var parts = [];
    if (step.duration) parts.push('מנוחה ' + step.duration + ' שניות.');
    if (step.nextName) parts.push('הבא: ' + step.nextName + (step.nextDetail ? ', ' + step.nextDetail : ''));
    return parts.join(' ');
  }

  /** Speaks Hebrew via the device's speechSynthesis (works offline with a local voice). Returns true if queued. */
  function speakHebrew(text, win) {
    win = win || root;
    var synth = win && win.speechSynthesis;
    var Utter = win && win.SpeechSynthesisUtterance;
    if (!text || !synth || !Utter) return false;
    try {
      var u = new Utter(String(text));
      u.lang = 'he-IL';
      var voices = synth.getVoices ? synth.getVoices() : [];
      var he = (voices || []).filter(function (v) { return /^he|^iw/i.test(v.lang || ''); })[0];
      if (he) u.voice = he;
      synth.cancel();
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }

  var cueAudio = null;
  /** Rest finished: vibrate + short double beep (AudioContext, no audio files). */
  function restEndCue(win, opts) {
    win = win || root;
    opts = opts || {};
    var out = { vibrated: false, beeped: false };
    try {
      var nav = win.navigator;
      if (nav && typeof nav.vibrate === 'function') out.vibrated = !!nav.vibrate([200, 100, 200]);
    } catch (e) {}
    if (opts.sound === false) return out;
    try {
      var AC = win.AudioContext || win.webkitAudioContext;
      if (!AC) return out;
      cueAudio = cueAudio || new AC();
      if (cueAudio.state === 'suspended' && cueAudio.resume) cueAudio.resume();
      var t = cueAudio.currentTime;
      [0, 0.25].forEach(function (offset) {
        var osc = cueAudio.createOscillator();
        var gain = cueAudio.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.4, t + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);
        osc.connect(gain);
        gain.connect(cueAudio.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.2);
      });
      out.beeped = true;
    } catch (e) {}
    return out;
  }

  /** Unlocks audio on a user gesture (iOS/Chrome autoplay rules). */
  function primeAudio(win) {
    win = win || root;
    try {
      var AC = win.AudioContext || win.webkitAudioContext;
      if (!AC) return false;
      cueAudio = cueAudio || new AC();
      if (cueAudio.state === 'suspended' && cueAudio.resume) cueAudio.resume();
      return true;
    } catch (e) { return false; }
  }

  function assetUrl(rel) {
    var path = (root.location && location.pathname) || '';
    if (/\/frontend(\/|$)/.test(path)) return '../' + rel.replace(/^\.\//, '');
    return './' + rel.replace(/^\.\//, '');
  }

  function offerUrl() {
    return assetUrl('offer.html');
  }

  function printUrl() {
    return assetUrl('workout-print.html');
  }

  function hashAccessCode(code) {
    var s = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
    var h = 2166136261;
    var i;
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function sanitizeBrand(name) {
    var s = String(name == null ? '' : name);
    var prev;
    do {
      prev = s;
      s = s.replace(/<[^>]*>/g, '');
    } while (s !== prev);
    s = s.replace(/\.mp4/ig, '').trim();
    if (s.length > 60) s = s.slice(0, 60);
    return s;
  }

  function emptyEntitlement() {
    return { tier: 'free', canShare: false, canBrandedPdf: false, brand: '', at: 0 };
  }

  function entitlement() {
    var rec = storeGet(KEYS.access, null);
    if (!rec || rec.tier !== 'trainer') return emptyEntitlement();
    return {
      tier: 'trainer',
      canShare: true,
      canBrandedPdf: true,
      brand: sanitizeBrand(rec.brand || ''),
      at: rec.at || 0
    };
  }

  function setEntitlement(rec) {
    rec = rec || {};
    if (rec.tier !== 'trainer') {
      storeRemove(KEYS.access);
      return emptyEntitlement();
    }
    storeSet(KEYS.access, {
      tier: 'trainer',
      brand: sanitizeBrand(rec.brand || ''),
      at: rec.at || Date.now()
    });
    return entitlement();
  }

  function clearEntitlement() {
    storeRemove(KEYS.access);
    return emptyEntitlement();
  }

  function redeemAccessCode(code, brand) {
    if (hashAccessCode(code) !== ACCESS_HASH) {
      return { ok: false, error: 'הקוד לא תואם. אין סליקה באתר — הקוד נשלח אחרי תשלום.' };
    }
    var ent = setEntitlement({ tier: 'trainer', brand: brand });
    if (ent.tier !== 'trainer') {
      return { ok: false, error: 'הקוד נכון, אבל הגישה לא נשמרה: הדפדפן חוסם שמירה (למשל גלישה פרטית). פתחו בדפדפן רגיל ונסו שוב.' };
    }
    return { ok: true, entitlement: ent };
  }

  function normalizeEntry(id, raw, defaultSource) {
    var e = raw && typeof raw === 'object' ? raw : {};
    return {
      id: e.id || id,
      he: e.he || e.id || id,
      muscles: Array.isArray(e.muscles) && e.muscles.length ? e.muscles.slice() : ['core'],
      equipment: Array.isArray(e.equipment) && e.equipment.length ? e.equipment.slice() : ['none'],
      level: e.level || 'beginner',
      source: e.source || defaultSource || 'local',
      file: e.file || '',
      driveId: e.driveId || '',
      youtubeId: e.youtubeId || '',
      folder: e.folder || '',
      externalUrl: e.externalUrl || '',
      available: e.available !== false,
      startSec: e.startSec != null ? Number(e.startSec) : null,
      endSec: e.endSec != null ? Number(e.endSec) : null,
      segmentOf: e.segmentOf || ''
    };
  }

  function isPlayable(e) {
    return !!(e && e.available !== false && (e.file || e.driveId || e.youtubeId));
  }

  function playableKind(e) {
    if (!e || e.available === false) return null;
    if (e.file) return 'file';
    if (e.driveId) return 'drive';
    if (e.youtubeId) return 'youtube';
    if (e.externalUrl) return 'link';
    return null;
  }

  function drivePreviewUrl(id) {
    if (!id) return '';
    return 'https://drive.google.com/file/d/' + id + '/preview';
  }

  function youtubeEmbedUrl(id, startSec, endSec) {
    if (!id) return '';
    var url = 'https://www.youtube.com/embed/' + id;
    var q = [];
    if (startSec != null && startSec >= 0) q.push('start=' + Math.floor(startSec));
    if (endSec != null && endSec > 0) q.push('end=' + Math.floor(endSec));
    return q.length ? (url + '?' + q.join('&')) : url;
  }

  function isOnline() {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  }

  function driveItemsFrom(driveData) {
    if (!driveData) return [];
    if (Array.isArray(driveData)) return driveData;
    if (Array.isArray(driveData.items)) return driveData.items;
    if (typeof driveData === 'object') {
      return Object.keys(driveData).filter(function (k) {
        return k.charAt(0) !== '_';
      }).map(function (k) {
        var e = driveData[k] || {};
        return e.id ? e : Object.assign({ id: k }, e);
      });
    }
    return [];
  }

  function mergeCatalogs(localMap, driveData, userList) {
    var out = {};
    if (localMap && typeof localMap === 'object' && !Array.isArray(localMap)) {
      Object.keys(localMap).forEach(function (id) {
        out[id] = normalizeEntry(id, localMap[id], (localMap[id] && localMap[id].source) || 'local');
      });
    }
    driveItemsFrom(driveData).forEach(function (raw) {
      if (!raw) return;
      var defaultSource = raw.source || (raw.file ? 'onedrive' : 'drive');
      var e = normalizeEntry(raw.id || raw.driveId || raw.file, raw, defaultSource);
      if (!isPlayable(e)) return;
      var duplicateAsset = e.file && Object.keys(out).some(function (existingId) {
        return out[existingId] && out[existingId].file === e.file;
      });
      if (duplicateAsset) return;
      var id = e.id;
      if (out[id]) id = (e.source || 'media') + '_' + id;
      e.id = id;
      out[id] = e;
    });
    (userList || []).forEach(function (raw) {
      if (!raw || !raw.id) return;
      out[raw.id] = normalizeEntry(raw.id, raw, raw.source || 'user');
    });
    return out;
  }

  function catalogList() {
    return Object.keys(catalog).map(function (id) {
      var e = catalog[id] || {};
      return {
        id: id,
        he: e.he,
        muscles: e.muscles || [],
        equipment: e.equipment || ['none'],
        level: e.level || 'beginner',
        file: e.file || '',
        source: e.source || 'local',
        driveId: e.driveId || '',
        youtubeId: e.youtubeId || '',
        folder: e.folder || '',
        externalUrl: e.externalUrl || '',
        available: e.available !== false,
        startSec: e.startSec != null ? e.startSec : null,
        endSec: e.endSec != null ? e.endSec : null,
        segmentOf: e.segmentOf || ''
      };
    });
  }

  function heName(id) {
    if (!id) return '';
    if (HE_NAMES[id]) return HE_NAMES[id];
    if (catalog[id] && catalog[id].he) return catalog[id].he;
    return String(id).replace(/_/g, ' ');
  }

  function findExercise(step) {
    if (!step) return null;
    var id = step.id || step.name;
    if (id && catalog[id] && isPlayable(catalog[id])) return catalog[id];
    var name = step.name;
    var keys = Object.keys(catalog);
    for (var i = 0; i < keys.length; i++) {
      var entry = catalog[keys[i]];
      if (!entry || !isPlayable(entry)) continue;
      if (id && (entry.id === id || keys[i] === id)) return entry;
      if (name && (entry.he === name || keys[i] === name || HE_NAMES[keys[i]] === name)) return entry;
    }
    return null;
  }

  function catalogSrc(file) {
    if (!file) return '';
    if (/^https?:\/\//i.test(file)) return file;
    if (file.indexOf('../') === 0 || file.indexOf('./') === 0 || file.charAt(0) === '/') return file;
    var name = String(file).replace(/^videos\//, '');
    var encoded = name.split('/').map(function (part) {
      return encodeURIComponent(part);
    }).join('/');
    return assetUrl('videos/' + encoded);
  }

  function phaseLabel(name) {
    return PHASE_LABELS[name] || name;
  }

  function toPhasesWorkout(d, meta) {
    meta = meta || {};
    if (d && Array.isArray(d.phases) && d.phases.length) {
      return {
        title: d.title || ('אימון ' + (d.day || '')),
        duration_minutes: d.duration_minutes || phasesMinutes(d.phases) || 45,
        participants: 1,
        equipment: meta.equipment || [],
        intensity: meta.intensity || 'medium',
        tags: meta.tags || ['program'],
        phases: d.phases
      };
    }
    var mainEx = (d.exercises || []).map(function (x) {
      return {
        name: heName(x.name),
        id: x.id || x.name,
        sets: x.sets != null ? x.sets : null,
        reps: x.reps != null ? x.reps : null,
        duration_seconds: x.duration_seconds != null ? x.duration_seconds : null,
        rest_seconds: x.restSeconds != null ? x.restSeconds : (x.rest_seconds != null ? x.rest_seconds : null),
        notes: x.notes || null
      };
    });
    var warm = d.warmUp ? [{
      name: heName(d.warmUp), id: d.warmUp, sets: 1, reps: null,
      duration_seconds: 180, rest_seconds: null, notes: null
    }] : [];
    var cool = d.coolDown ? [{
      name: heName(d.coolDown), id: d.coolDown, sets: 1, reps: null,
      duration_seconds: 180, rest_seconds: null, notes: null
    }] : [];
    // The Main phase lasts as long as its sets and rests: a beginner's four
    // 3×8-12 exercises take about 14 minutes and an advanced strength day's
    // six 4×4-6 with 2-minute rests about 42, so the trainee page and the
    // print sheet do not promise «45 דקות» for either.
    var mainSeconds = mainEx.reduce(function (a, ex) { return a + draftExerciseSeconds(ex); }, 0);
    var phases = [
      { name: 'Warm-up', duration_minutes: 5, exercises: warm },
      { name: 'Main', duration_minutes: Math.round(mainSeconds / 60), exercises: mainEx },
      { name: 'Cool-down', duration_minutes: 5, exercises: cool }
    ];
    return {
      title: d.title || ('אימון ' + (d.day || '')),
      duration_minutes: phasesMinutes(phases),
      participants: 1,
      equipment: meta.equipment || [],
      intensity: meta.intensity || 'medium',
      tags: meta.tags || ['program'],
      phases: phases
    };
  }

  function phasesMinutes(phases) {
    return (phases || []).reduce(function (a, ph) { return a + (Number(ph && ph.duration_minutes) || 0); }, 0);
  }

  function workoutVolume(sets) {
    if (!Array.isArray(sets)) return 0;
    var total = 0;
    for (var i = 0; i < sets.length; i++) {
      var set = sets[i];
      if (!set || typeof set !== 'object') continue;
      if (typeof set.reps !== 'number' || typeof set.weightKg !== 'number') continue;
      if (!(set.reps > 0) || !(set.weightKg > 0)) continue;
      total += set.reps * set.weightKg;
    }
    return Math.round(total * 10) / 10;
  }

  function utf8ToB64url(str) {
    var bytes = new TextEncoder().encode(String(str));
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlToUtf8(s) {
    var t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var bin = atob(t);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function compactPlan(w) {
    w = w || {};
    return {
      t: w.title || 'אימון',
      d: w.duration_minutes || null,
      i: w.intensity || null,
      c: w.participants || 1,
      q: w.equipment || [],
      g: w.group_plan ? {
        s: w.group_plan.stations || 1,
        p: w.group_plan.per_station || 1,
        h: w.group_plan.he || ''
      } : null,
      p: (w.phases || []).map(function (ph) {
        return {
          n: ph.name,
          e: (ph.exercises || []).map(function (ex) {
            var row = { n: ex.name };
            if (ex.id) row.id = ex.id;
            if (ex.sets != null) row.s = ex.sets;
            if (ex.reps != null) row.r = ex.reps;
            if (ex.duration_seconds != null) row.ds = ex.duration_seconds;
            if (ex.rest_seconds != null) row.rs = ex.rest_seconds;
            if (ex.notes != null && ex.notes !== '') row.no = ex.notes;
            return row;
          })
        };
      })
    };
  }

  function expandPlan(c) {
    c = c || {};
    return {
      title: c.t || 'אימון',
      duration_minutes: c.d || null,
      intensity: c.i || null,
      participants: c.c || 1,
      equipment: c.q || [],
      group_plan: c.g ? { stations: c.g.s || 1, per_station: c.g.p || 1, he: c.g.h || '' } : null,
      phases: (c.p || []).map(function (ph) {
        return {
          name: ph.n,
          exercises: (ph.e || []).map(function (ex) {
            return {
              name: ex.n,
              id: ex.id || null,
              sets: ex.s != null ? ex.s : null,
              reps: ex.r != null ? ex.r : null,
              duration_seconds: ex.ds != null ? ex.ds : null,
              rest_seconds: ex.rs != null ? ex.rs : null,
              notes: ex.no != null && ex.no !== '' ? ex.no : null
            };
          })
        };
      })
    };
  }

  function workoutModeUrl() {
    var here = location.href.split('#')[0].split('?')[0];
    if (/workout-mode\.html$/i.test(here)) return here;
    if (/\/frontend(\/index\.html)?\/?$/i.test(here)) {
      return here.replace(/index\.html$/i, '').replace(/\/?$/, '/') + 'workout-mode.html';
    }
    if (/\/frontend\//i.test(here)) {
      return here.replace(/\/frontend\/[^/]*$/, '/frontend/workout-mode.html');
    }
    var base = here.replace(/\/[^/]+\.html$/i, '/');
    return base.replace(/\/?$/, '/') + 'frontend/workout-mode.html';
  }

  function encodeLink(workout, meta) {
    meta = meta || {};
    var payload = {
      p: compactPlan(workout),
      wa: meta.wa || '',
      n: meta.name || '',
      tid: meta.tid || ('t_' + Date.now().toString(36))
    };
    return workoutModeUrl() + '#TH.' + utf8ToB64url(JSON.stringify(payload));
  }

  function shareToClient(workout, meta) {
    if (!entitlement().canShare) {
      return { ok: false, gated: true, code: 'share_requires_trainer', offerUrl: offerUrl() };
    }
    if (!workout) {
      return { ok: false, error: 'אין אימון לשיתוף' };
    }
    return { ok: true, url: encodeLink(workout, meta || {}) };
  }

  // Copy text to the clipboard. Resolves {ok:true} only after a real copy.
  function copyText(text) {
    return new Promise(function (resolve) {
      try {
        var nav = typeof navigator !== 'undefined' ? navigator : root.navigator;
        var clip = nav && nav.clipboard;
        if (!clip || typeof clip.writeText !== 'function') { resolve({ ok: false }); return; }
        clip.writeText(String(text)).then(function () { resolve({ ok: true }); }, function () { resolve({ ok: false }); });
      } catch (e) { resolve({ ok: false }); }
    });
  }

  function manualCopyMarkup(text) {
    return '<div class="th-manual-copy" role="status">' +
      '<p>הדפדפן חסם העתקה אוטומטית. סמנו את הטקסט והעתיקו ידנית:</p>' +
      '<textarea readonly rows="3" style="width:100%;direction:ltr">' + esc(text) + '</textarea>' +
      '</div>';
  }

  // Copy, or show the text for a manual copy next to `anchor`. onOk runs only after a real copy.
  // A box left by an earlier refused copy is removed either way: after a later
  // successful copy it would still show the old link (e.g. the plan before the
  // dropdown changed) as if it were the one to send.
  function copyOrShow(text, anchor, onOk, position) {
    return copyText(text).then(function (r) {
      var host = anchor && anchor.parentNode;
      var prev = host && host.querySelector && host.querySelector('.th-manual-copy');
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
      if (r.ok) {
        if (onOk) onOk();
        return r;
      }
      if (anchor && anchor.insertAdjacentHTML) {
        anchor.insertAdjacentHTML(position || 'afterend', manualCopyMarkup(text));
      }
      return r;
    });
  }

  function gateMarkup(kind) {
    var title = kind === 'pdf'
      ? 'ייצוא ממותג ללקוח כלול במסלול מאמן'
      : 'שיתוף אימון ללקוח כלול במסלול מאמן';
    return '<div class="th-gate" role="status">' +
      '<p><strong>' + esc(title) + '</strong></p>' +
      '<p>₪59 לחודש למאמן אחד, בלי CRM. אין סליקה באתר — אחרי תשלום מקבלים קוד גישה.</p>' +
      '<p><a class="th-gate-link" href="' + esc(offerUrl()) + '#share">לפרטי ההצעה</a></p>' +
      '</div>';
  }

  function decodeHash(hash) {
    var raw = String(hash || location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    var token = raw;
    if (raw.indexOf('TH.') === 0) token = raw.slice(3);
    else if (raw.indexOf('p=') === 0) token = raw.slice(2);
    else return null;
    try {
      var data = JSON.parse(b64urlToUtf8(token));
      if (!data || !data.p) return null;
      return {
        workout: expandPlan(data.p),
        wa: data.wa || '',
        name: data.n || '',
        tid: data.tid || ''
      };
    } catch (e) {
      return null;
    }
  }

  // ---- QR code (self-written, no library, no network) ----------------------
  // Byte mode, error correction M (falls back to L for long links), versions
  // 1-40, all 8 masks scored. Follows ISO/IEC 18004; output is an SVG string.
  var QR_ECC = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]
  };
  var QR_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]
  };
  function qrRawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function qrDataCodewords(ver, ecl) {
    return Math.floor(qrRawModules(ver) / 8) - QR_ECC[ecl][ver] * QR_BLOCKS[ecl][ver];
  }
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ res.shift();
      res.push(0);
      div.forEach(function (c, i) { res[i] ^= gfMul(c, f); });
    });
    return res;
  }
  function qrAlignPositions(ver, size) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2;
    var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    var res = [6];
    for (var pos = size - 7; res.length < n; pos -= step) res.splice(1, 0, pos);
    return res;
  }
  function qrPenalty(m, size) {
    var p = 0, x, y, dark = 0;
    function lines(get) {
      for (var a = 0; a < size; a++) {
        var run = 1, s = '';
        for (var b = 0; b < size; b++) {
          var v = get(a, b);
          s += v ? '1' : '0';
          if (b > 0 && v === get(a, b - 1)) run++;
          else { if (run >= 5) p += run - 2; run = 1; }
        }
        if (run >= 5) p += run - 2;
        var pad = '0000' + s + '0000', k = -1;
        while ((k = pad.indexOf('10111010000', k + 1)) !== -1) p += 40;
        k = -1;
        while ((k = pad.indexOf('00001011101', k + 1)) !== -1) p += 40;
      }
    }
    lines(function (a, b) { return m[a][b]; });
    lines(function (a, b) { return m[b][a]; });
    for (y = 0; y < size; y++) {
      for (x = 0; x < size; x++) {
        if (m[y][x]) dark++;
        if (x < size - 1 && y < size - 1) {
          var c = m[y][x];
          if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
        }
      }
    }
    var total = size * size;
    p += Math.max(0, Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return p;
  }

  // Returns {version, ecl, size, modules[y][x] booleans} or null when the text
  // is too long for any version.
  function qrMatrix(text) {
    var bytes = [];
    var utf = unescape(encodeURIComponent(String(text || '')));
    for (var i = 0; i < utf.length; i++) bytes.push(utf.charCodeAt(i));
    var ver = 0, ecl = null;
    ['M', 'L'].some(function (e) {
      for (var v = 1; v <= 40; v++) {
        var bits = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
        if (bits <= qrDataCodewords(v, e) * 8) { ver = v; ecl = e; return true; }
      }
      return false;
    });
    if (!ver) return null;
    var cap = qrDataCodewords(ver, ecl) * 8;
    var bb = [];
    function put(val, len) { for (var k = len - 1; k >= 0; k--) bb.push((val >>> k) & 1); }
    put(4, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap - bb.length));
    put(0, (8 - bb.length % 8) % 8);
    for (var pad = 0xEC; bb.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (i = 0; i < bb.length; i += 8) {
      var byte = 0;
      for (var j = 0; j < 8; j++) byte = (byte << 1) | bb[i + j];
      data.push(byte);
    }
    // Split into blocks, add Reed-Solomon, interleave.
    var nb = QR_BLOCKS[ecl][ver], eccLen = QR_ECC[ecl][ver];
    var raw = Math.floor(qrRawModules(ver) / 8);
    var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var div = rsDivisor(eccLen), blocks = [], k = 0;
    for (i = 0; i < nb; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var words = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (j = 0; j < blocks.length; j++) {
        if (i !== shortLen - eccLen || j >= nShort) words.push(blocks[j][i]);
      }
    }
    var size = ver * 4 + 17, mod = [], fn = [];
    for (i = 0; i < size; i++) {
      mod.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    function setFn(x, y, d) { mod[y][x] = d; fn[y][x] = true; }
    for (i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d !== 2 && d !== 4);
        }
      }
    });
    var al = qrAlignPositions(ver, size), na = al.length;
    for (i = 0; i < na; i++) {
      for (j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (var ay = -2; ay <= 2; ay++) {
          for (var ax = -2; ax <= 2; ax++) setFn(al[i] + ax, al[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
        }
      }
    }
    function formatBits(mask) {
      var d = ((ecl === 'L' ? 1 : 0) << 3) | mask, r = d;
      for (var q = 0; q < 10; q++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bits = ((d << 10) | r) ^ 0x5412;
      function bit(n) { return ((bits >>> n) & 1) !== 0; }
      for (q = 0; q <= 5; q++) setFn(8, q, bit(q));
      setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
      for (q = 9; q < 15; q++) setFn(14 - q, 8, bit(q));
      for (q = 0; q < 8; q++) setFn(size - 1 - q, 8, bit(q));
      for (q = 8; q < 15; q++) setFn(8, size - 15 + q, bit(q));
      setFn(8, size - 8, true);
    }
    formatBits(0);
    if (ver >= 7) {
      var r = ver;
      for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      var vb = (ver << 12) | r;
      for (i = 0; i < 18; i++) {
        var on = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, b = Math.floor(i / 3);
        setFn(a, b, on); setFn(b, a, on);
      }
    }
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (j = 0; j < 2; j++) {
          var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < words.length * 8) {
            mod[y][x] = ((words[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
            bi++;
          }
        }
      }
    }
    function applyMask(mask) {
      for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) {
          var inv;
          switch (mask) {
            case 0: inv = (xx + yy) % 2 === 0; break;
            case 1: inv = yy % 2 === 0; break;
            case 2: inv = xx % 3 === 0; break;
            case 3: inv = (xx + yy) % 3 === 0; break;
            case 4: inv = (Math.floor(xx / 3) + Math.floor(yy / 2)) % 2 === 0; break;
            case 5: inv = xx * yy % 2 + xx * yy % 3 === 0; break;
            case 6: inv = (xx * yy % 2 + xx * yy % 3) % 2 === 0; break;
            default: inv = ((xx + yy) % 2 + xx * yy % 3) % 2 === 0;
          }
          if (inv && !fn[yy][xx]) mod[yy][xx] = !mod[yy][xx];
        }
      }
    }
    var best = 0, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      applyMask(mk); formatBits(mk);
      var pen = qrPenalty(mod, size);
      if (pen < bestP) { bestP = pen; best = mk; }
      applyMask(mk);
    }
    applyMask(best); formatBits(best);
    return { version: ver, ecl: ecl, size: size, mask: best, modules: mod };
  }

  // SVG with a 4-module quiet zone, dark on white so phone cameras read it on a dark page.
  function qrSvg(text, opts) {
    opts = opts || {};
    var q = qrMatrix(text);
    if (!q) return '';
    var n = q.size + 8, d = '';
    for (var y = 0; y < q.size; y++) {
      for (var x = 0; x < q.size; x++) if (q.modules[y][x]) d += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
    }
    var px = opts.size || 220;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="th-qr" role="img" aria-label="' + esc(opts.label || 'קוד QR לקישור') +
      '" width="' + px + '" height="' + px + '" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges">' +
      '<rect width="' + n + '" height="' + n + '" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
  }

  // Markup shown under a share action: the QR plus the link itself.
  function shareQrMarkup(url) {
    var svg = qrSvg(url, { label: 'קוד QR לקישור האימון' });
    if (!svg) return '';
    return '<figure class="th-share-qr" data-role="share-qr" style="margin:12px 0;text-align:center">' + svg +
      '<figcaption style="font-size:0.8rem;margin-top:6px">סורקים במצלמה של הטלפון כדי לפתוח את האימון (נוצר במכשיר, בלי שירות חיצוני)</figcaption></figure>';
  }

  function encodeResult(result) {
    result = result || {};
    var payload = {
      v: 1,
      n: result.name || '',
      t: result.title || '',
      at: result.doneAt || new Date().toISOString(),
      m: result.minutes != null ? result.minutes : 0,
      e: result.exercises != null ? result.exercises : 0,
      s: result.sets != null ? result.sets : 0,
      sk: result.skipped != null ? result.skipped : 0,
      tid: result.tid || '',
      rpe: result.rpe != null ? result.rpe : null,
      pl: result.plan || null
    };
    // Optional per-exercise detail, added later. Old readers ignore «x», and a
    // code without it decodes to an empty log, so old and new codes both import.
    var x = compactExerciseLog(result.log);
    if (x.length) payload.x = x;
    return 'TH1.' + utf8ToB64url(JSON.stringify(payload));
  }

  function normalizeResult(obj) {
    if (!obj || typeof obj !== 'object') return null;
    return {
      v: 1,
      name: obj.n || obj.name || '',
      title: obj.t || obj.title || 'אימון',
      doneAt: obj.at || obj.doneAt || new Date().toISOString(),
      minutes: Number(obj.m != null ? obj.m : obj.minutes) || 0,
      exercises: Number(obj.e != null ? obj.e : obj.exercises) || 0,
      sets: Number(obj.s != null ? obj.s : obj.sets) || 0,
      skipped: Number(obj.sk != null ? obj.sk : obj.skipped) || 0,
      tid: obj.tid || '',
      rpe: obj.rpe != null ? Number(obj.rpe) : null,
      plan: obj.pl || obj.plan || null,
      log: expandExerciseLog(obj.x || obj.log)
    };
  }

  // log: [{id, sets:[{reps, weightKg}], rpe}] <-> x: [[id, [[reps, kg], ...], rpe]]
  function cleanNum(v, max) {
    var n = Number(v);
    return isFinite(n) && n > 0 && n <= max ? Math.round(n * 10) / 10 : 0;
  }
  function compactExerciseLog(log) {
    if (!Array.isArray(log)) return [];
    return log.map(function (ex) {
      if (!ex || !ex.id) return null;
      var sets = (Array.isArray(ex.sets) ? ex.sets : []).map(function (st) {
        var r = cleanNum(st && st.reps, 1000);
        return r ? [r, cleanNum(st.weightKg, 1000)] : null;
      }).filter(Boolean);
      var rpe = cleanNum(ex.rpe, 10);
      if (!sets.length && !rpe) return null;
      return [String(ex.id).slice(0, 80), sets, rpe];
    }).filter(Boolean);
  }
  function expandExerciseLog(x) {
    if (!Array.isArray(x)) return [];
    return x.map(function (row) {
      if (Array.isArray(row)) {
        return {
          id: String(row[0] || ''),
          sets: (Array.isArray(row[1]) ? row[1] : []).map(function (st) {
            return { reps: cleanNum(st && st[0], 1000), weightKg: cleanNum(st && st[1], 1000) };
          }).filter(function (st) { return st.reps; }),
          rpe: cleanNum(row[2], 10) || null
        };
      }
      if (row && row.id) return expandExerciseLog(compactExerciseLog([row]))[0] || null;
      return null;
    }).filter(function (e) { return e && e.id; });
  }

  function decodeResult(text) {
    var m = String(text || '').match(/TH1\.[A-Za-z0-9_-]+/);
    if (!m) {
      try {
        var obj = JSON.parse(String(text || '').trim());
        if (obj && (obj.v === 1 || obj.at || obj.t)) return normalizeResult(obj);
      } catch (e) {}
      return null;
    }
    try {
      return normalizeResult(JSON.parse(b64urlToUtf8(m[0].slice(4))));
    } catch (e) {
      return null;
    }
  }

  function waShareUrl(phone, message) {
    var digits = String(phone || '').replace(/\D/g, '');
    // «00972…» is the dialled international prefix, and «+972-050-…» keeps the
    // trunk 0 after the country code; wa.me wants neither.
    var intl = digits.replace(/^00/, '');
    if (intl.charAt(0) === '0') intl = '972' + intl.slice(1);
    if (intl.indexOf('9720') === 0) intl = '972' + intl.slice(4);
    else if (intl.length === 9 && intl.charAt(0) === '5') intl = '972' + intl;
    if (intl && !/^\d{8,15}$/.test(intl)) intl = '';
    var base = intl ? ('https://wa.me/' + intl) : 'https://wa.me/';
    return base + '?text=' + encodeURIComponent(message);
  }

  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  function generateId() {
    return 'prog_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function normalizeGoal(raw) {
    if (raw === 'strength') return 'strength';
    if (raw === 'endurance') return 'endurance';
    if (raw === 'hypertrophy' || raw === 'muscle_gain') return 'hypertrophy';
    return 'hypertrophy';
  }

  function prescriptionFor(goal, isSenior) {
    var base = GOAL_RX[goal] || GOAL_RX.hypertrophy;
    if (isSenior) return { sets: Math.min(base.sets, 3), reps: base.reps, rest: Math.max(base.rest, 90), hold: base.hold };
    return { sets: base.sets, reps: base.reps, rest: base.rest, hold: base.hold };
  }

  function userCanDo(ex, userEquipment) {
    var have = {};
    (userEquipment || []).forEach(function (e) { if (e && e !== 'none') have[e] = true; });
    var options = ex.equipment && ex.equipment.length ? ex.equipment : ['none'];
    return options.some(function (eq) { return eq === 'none' || have[eq]; });
  }

  function splitNameForDay(dayIndex, daysPerWeek) {
    if (daysPerWeek <= 1) return 'full';
    if (daysPerWeek === 2) return ['upper', 'lower'][dayIndex % 2];
    if (daysPerWeek === 3) return ['push', 'pull', 'legs'][dayIndex % 3];
    if (daysPerWeek === 4) return ['upper', 'lower', 'upper', 'lower'][dayIndex % 4];
    return ['push', 'pull', 'legs', 'upper', 'lower'][dayIndex % 5];
  }

  function musclesForDay(dayIndex, daysPerWeek, targetMuscles, injuredParts) {
    var injured = {};
    (injuredParts || []).forEach(function (p) { injured[p] = true; });
    var requested = (targetMuscles || []).filter(function (m) {
      return BODY_PARTS.indexOf(m) !== -1 && !injured[m];
    });
    if (requested.length) return requested;
    var split = splitNameForDay(dayIndex, daysPerWeek);
    var fromSplit = (SPLIT_MUSCLES[split] || SPLIT_MUSCLES.full).filter(function (m) { return !injured[m]; });
    return fromSplit.length ? fromSplit : ['core'];
  }

  function rankCandidates(candidates, opts) {
    opts = opts || {};
    var audience = opts.audience === 'kids' || opts.audience === 'sport' ? opts.audience : '';
    var reservedTags = ['kids', 'sport', 'partner'];
    var list = candidates.filter(function (ex) {
      var tags = ex.tags || [];
      return !reservedTags.some(function (tag) {
        return tags.indexOf(tag) !== -1 && tag !== audience;
      });
    });
    // Audience first: a kids plan with dumbbells or bands must keep its kids drills, and only
    // then prefer the ones that use the chosen equipment.
    if (audience) {
      var tagged = list.filter(function (ex) {
        return (ex.tags || []).indexOf(audience) !== -1;
      });
      if (tagged.length) list = tagged;
    }
    var requestedEquipment = (opts.equipment || []).filter(function (eq) {
      return eq && eq !== 'none';
    });
    if (requestedEquipment.length) {
      var equipped = list.filter(function (ex) {
        return (ex.equipment || []).some(function (eq) {
          return requestedEquipment.indexOf(eq) !== -1;
        });
      });
      if (equipped.length) list = equipped;
    }
    if (opts.preferClips) {
      // A clip outranks the program's own exercise only when one of them has a clip.
      // The catalog has no squat, lunge or glute-bridge clip, so for legs the clipped
      // candidates were all catalog drills tagged legs («מסירות דיוק», «תרגיל תגובה»,
      // «פסים»): a bodyweight «רגליים» program had no squat at all. When none of the
      // slot's built-in exercises has a clip, they come first and the drills fill in.
      var builtins = list.filter(function (ex) { return ex.builtin; });
      var clipped = list.filter(function (ex) { return ex.hasClip; });
      if (builtins.length && !builtins.some(function (ex) { return ex.hasClip; })) list = builtins;
      else if (clipped.length) list = clipped;
    }
    return list;
  }

  // Muscles that share a split with the requested ones: a «גב» day that runs out of
  // back drills goes on with biceps (pull), a «חזה» day with shoulders and triceps (push),
  // a «ליבה» day with legs (lower). Not upper/full, which would mean "anything".
  var FILL_SPLITS = ['push', 'pull', 'lower'];
  function relatedMuscles(muscles) {
    var related = [];
    FILL_SPLITS.forEach(function (split) {
      var group = SPLIT_MUSCLES[split];
      if (!group.some(function (m) { return muscles.indexOf(m) !== -1; })) return;
      group.forEach(function (m) {
        if (muscles.indexOf(m) === -1 && related.indexOf(m) === -1) related.push(m);
      });
    });
    return related;
  }

  function pickExercises(dayIndex, muscles, pool, count, rx, notes, opts) {
    opts = opts || {};
    var used = {};
    // Two catalog entries can play the same video (the «ילדים קונוסים אחד על אחד» clip
    // is filed under two ids), so a day marks the clip as used too and the trainee
    // never watches the same drill twice under two names.
    var usedClips = {};
    function clipOf(id) {
      var clip = catalog[id];
      return clip && isPlayable(clip) && clip.file ? clip.file : '';
    }
    function markUsed(id) {
      used[id] = true;
      var file = clipOf(id);
      if (file) usedClips[file] = true;
    }
    // The day's warm-up / cool-down drill is not also a Main exercise.
    (opts.exclude || []).forEach(function (id) { if (id) markUsed(id); });
    var exercises = [];
    // The requested muscles fill the day first. When they run dry (a bodyweight «גב»
    // day has two back drills for four slots) the remaining slots take the muscles that
    // share their split, so the day carries the number of exercises its level promises
    // (weekly.html shows «N תרגילים באימון») instead of a two-drill program, and a «גב»
    // program still never turns into squats. Before this the fallback added a single
    // drill, and only to a day with no exercise at all.
    var tiers = [muscles, relatedMuscles(muscles)];
    for (var t = 0; t < tiers.length && exercises.length < count; t++) {
      var tier = tiers[t];
      if (tier && !tier.length) continue;
      var slot = 0;
      var misses = 0;
      while (exercises.length < count && misses < (tier ? tier.length : 1)) {
        var muscle = tier ? tier[slot % tier.length] : null;
        var candidates = rankCandidates(pool.filter(function (ex) {
          return !used[ex.id] && !usedClips[clipOf(ex.id)] &&
            (!muscle || ex.muscles.indexOf(muscle) !== -1);
        }), opts);
        // A clip built for the slot's muscle (listed first) goes before a full-body
        // clip that merely includes it: the band clips «גומיות התנגדות» and «עבודה עם
        // גומייה» are tagged chest, back, legs, core, so a band «רגליים» day got four of
        // them and none of «גומיות ארבע ראשי» / «גומיות ירכיים», and a band «ליבה» day
        // never got «גומיות בטן». The full-body clips still fill in when those run out.
        if (muscle) {
          var primary = candidates.filter(function (ex) { return ex.muscles[0] === muscle; });
          if (primary.length) candidates = primary;
        }
        if (candidates.length) {
          var pick = candidates[(dayIndex + slot) % candidates.length];
          markUsed(pick.id);
          var hold = isHoldExercise(pick.id);
          exercises.push({
            name: pick.id, sets: rx.sets, reps: hold ? null : rx.reps,
            duration_seconds: hold ? rx.hold : null,
            restSeconds: rx.rest, rest_seconds: rx.rest, notes: notes
          });
          misses = 0;
        } else {
          misses++;
        }
        slot++;
      }
    }
    return exercises;
  }

  function generateWorkoutProgram(clientProfile, programDuration, workoutDaysPerWeek) {
    clientProfile = clientProfile || {};
    var safeAge = clamp(clientProfile.age != null ? clientProfile.age : 18, 10, 120);
    var age = clamp(safeAge, 18, 100);
    var fitnessLevel = ['beginner', 'intermediate', 'advanced'].indexOf(clientProfile.fitnessLevel) !== -1
      ? clientProfile.fitnessLevel : 'beginner';
    var goals = Array.isArray(clientProfile.goals) && clientProfile.goals.length ? clientProfile.goals : ['general_fitness'];
    var equipment = Array.isArray(clientProfile.availableEquipment) ? clientProfile.availableEquipment : [];
    var injuries = Array.isArray(clientProfile.injuries) ? clientProfile.injuries : [];
    if (injuries.indexOf('all') !== -1) return { programId: generateId(), durationWeeks: 0, dailyWorkouts: [] };

    var targetMuscles = Array.isArray(clientProfile.targetMuscles) ? clientProfile.targetMuscles : [];
    var previousWorkouts = Math.max(0, clientProfile.previousWorkouts != null ? clientProfile.previousWorkouts : 0);
    var isNew = previousWorkouts < 5;
    var duration = clamp(programDuration != null ? programDuration : 1, 1, 52);
    var daysPerWeek = clamp(workoutDaysPerWeek != null ? workoutDaysPerWeek : 1, 1, 7);
    var totalDays = duration * daysPerWeek;
    var isSenior = age > 60;
    var injuredParts = injuries.filter(function (p) { return BODY_PARTS.indexOf(p) !== -1; });
    var goalKey = normalizeGoal(goals[0]);
    var rx = prescriptionFor(goalKey, isSenior);
    var audience = clientProfile.audience === 'kids' || clientProfile.audience === 'sport'
      ? clientProfile.audience : '';
    var fromCatalog = catalogAsPool();
    var preferClips = clientProfile.preferCatalog !== false && fromCatalog.length > 0;
    var seenIds = {};
    var pool = PROGRAM_POOL.map(function (ex) {
      var copy = { id: ex.id, muscles: ex.muscles, equipment: ex.equipment, builtin: true };
      seenIds[ex.id] = true;
      var clip = catalog[ex.id];
      if (clip && isPlayable(clip)) {
        copy.hasClip = true;
        copy.tags = catalogTags(clip);
        // The trainee gets the catalog clip, so its equipment decides what the exercise
        // needs: bodyweight_row plays «מתח אוסטרלי» on a bar, not a bodyweight row, and
        // must not land in a «משקל גוף» program just because the built-in list says 'none'.
        if (Array.isArray(clip.equipment) && clip.equipment.length) copy.equipment = clip.equipment;
      }
      return copy;
    });
    fromCatalog.forEach(function (ex) {
      if (!seenIds[ex.id]) {
        pool.push(ex);
        seenIds[ex.id] = true;
      }
    });
    pool = pool.filter(function (ex) {
      if (!userCanDo(ex, equipment)) return false;
      if (ex.muscles.some(function (m) { return injuredParts.indexOf(m) !== -1; })) return false;
      return true;
    });
    // Exercise notes reach the trainee: workout-mode shows them under the
    // exercise, the print sheet gets a notes column and the share link carries
    // them. The whole app speaks Hebrew, so the notes do too.
    var noteParts = [];
    if (isSenior) noteParts.push('עצימות נמוכה');
    if (isNew) noteParts.push('דגש על טכניקה');
    var notes = noteParts.join(' · ');
    var numExercises = isSenior ? 4 : (fitnessLevel === 'advanced' ? 6 : fitnessLevel === 'beginner' ? 4 : 5);
    var meta = {
      equipment: equipment[0] === 'none' ? ['משקל גוף'] : equipment.map(function (e) { return eqLabel(e); }),
      intensity: goalKey === 'strength' ? 'high' : 'medium',
      tags: audience ? [goalKey, audience] : [goalKey]
    };
    var dailyWorkouts = [];
    var pickOpts = { preferClips: preferClips, audience: audience, equipment: equipment };
    for (var d = 0; d < totalDays; d++) {
      var split = splitNameForDay(d, daysPerWeek);
      var muscles = musclesForDay(d, daysPerWeek, targetMuscles, injuredParts);
      var warmUp = WARM_UPS[d % WARM_UPS.length];
      var coolDown = COOL_DOWNS[d % COOL_DOWNS.length];
      var dayOpts = Object.assign({ exclude: [warmUp, coolDown] }, pickOpts);
      var exercises = pickExercises(d, muscles, pool, numExercises, rx, notes, dayOpts);
      var day = {
        day: d + 1,
        split: targetMuscles.length ? 'focus' : split,
        warmUp: warmUp,
        exercises: exercises,
        coolDown: coolDown
      };
      day.phases = toPhasesWorkout(day, meta).phases;
      day.title = 'אימון ' + (d + 1);
      dailyWorkouts.push(day);
    }
    return { programId: generateId(), durationWeeks: duration, dailyWorkouts: dailyWorkouts };
  }

  function muscleLabel(id) {
    return MUSCLE_LABELS[id] || id;
  }

  function eqLabel(id) {
    return EQ_LABELS[id] || id;
  }

  function tagLabel(id) {
    return TAG_LABELS[id] || id;
  }

  function foldHe(s) {
    return String(s || '')
      .replace(/["״''׳]/g, '')
      .replace(/[־–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function catalogTags(entry) {
    var blob = foldHe(((entry && entry.he) || '') + ' ' + ((entry && entry.id) || ''));
    var tags = [];
    if (/ילד/.test(blob)) tags.push('kids');
    if (/זוג/.test(blob)) tags.push('partner');
    var eq = (entry && entry.equipment) || [];
    if (eq.indexOf('football') !== -1 || eq.indexOf('basketball') !== -1 || eq.indexOf('tennis-ball') !== -1) {
      tags.push('sport');
    }
    if (eq.indexOf('band') !== -1) tags.push('band');
    if (eq.indexOf('cones') !== -1) tags.push('cones');
    return tags;
  }

  // The designated warm-up clip («חימום») belongs to the Warm-up phase only.
  // Without this the weekly builder prescribed it in Main as 3 sets x 8-12 reps
  // of "warm-up" (its catalog muscle is core), next to the real warm-up drill.
  // Same rule as findWarmup in session-builder.js.
  function isWarmupClip(e) {
    return !!e && (e.id === 'warmup' || foldHe(e.he) === 'חימום');
  }

  // The other warm-up drills («חימום שכיבות שמיכה קונוסים על הגב», «כדורגל
  // חימום») stay out of Main too: with «קונוסים» the weekly builder opened
  // day 1 with the cone warm-up as 4 x 4-6 strength work. Same rule as the
  // Main pool in session-builder.js.
  function isWarmupDrill(e) {
    return isWarmupClip(e) || (!!e && /חימום/.test(foldHe(e.he)));
  }

  function catalogAsPool() {
    return catalogList().filter(function (e) {
      return isPlayable(e) && e.muscles && e.muscles.length && !isWarmupDrill(e);
    }).map(function (e) {
      return {
        id: e.id,
        muscles: e.muscles,
        equipment: e.equipment && e.equipment.length ? e.equipment : ['none'],
        hasClip: true,
        tags: catalogTags(e)
      };
    });
  }

  function catalogStats() {
    var list = catalogList();
    var byMuscle = {};
    var byEquipment = {};
    var byTag = {};
    var i;
    for (i = 0; i < BODY_PARTS.length; i++) byMuscle[BODY_PARTS[i]] = 0;
    list.forEach(function (e) {
      (e.muscles || []).forEach(function (m) {
        byMuscle[m] = (byMuscle[m] || 0) + 1;
      });
      (e.equipment || []).forEach(function (eq) {
        byEquipment[eq] = (byEquipment[eq] || 0) + 1;
      });
      catalogTags(e).forEach(function (t) {
        byTag[t] = (byTag[t] || 0) + 1;
      });
    });
    return {
      total: list.length,
      withFile: list.filter(function (e) { return !!e.file; }).length,
      playable: list.filter(isPlayable).length,
      byMuscle: byMuscle,
      byEquipment: byEquipment,
      byTag: byTag
    };
  }

  function filterCatalog(opts) {
    opts = opts || {};
    var q = foldHe(opts.q || '');
    return catalogList().filter(function (e) {
      if (opts.muscle && (e.muscles || []).indexOf(opts.muscle) === -1) return false;
      if (opts.equipment && (e.equipment || []).indexOf(opts.equipment) === -1) return false;
      if (opts.level && e.level !== opts.level) return false;
      if (opts.tag && catalogTags(e).indexOf(opts.tag) === -1) return false;
      if (q) {
        // The gear words count too, as the «גומיות» chip does: two band clips are
        // not named «גומיות» («עבודה עם גומייה»), so typing the word missed them.
        var gear = (e.equipment || []).map(function (eq) { return EQ_LABELS[eq] || ''; }).join(' ');
        var blob = foldHe((e.he || '') + ' ' + (e.id || '') + ' ' + muscleLabel((e.muscles || [])[0] || '') + ' ' + gear);
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function normalizeName(name) {
    var Infer = root.THInfer;
    if (Infer && typeof Infer.normalizeSynonym === 'function') return Infer.normalizeSynonym(name);
    return foldHe(name);
  }

  function sourcePref(e) {
    if (!e) return 0;
    if (e.available === false) return -1;
    if (e.source === 'onedrive' && e.file) return 5;
    if (e.driveId || e.source === 'drive') return 4;
    if (e.youtubeId || e.source === 'youtube') return 3;
    if (e.file) return 2;
    return 1;
  }

  function matchCatalog(name) {
    if (!name) return null;
    var n = normalizeName(name);
    if (!n) return null;
    var folded = foldHe(name);
    var hits = [];
    var aliasId = NAME_ALIASES[n] || NAME_ALIASES[folded];
    if (aliasId && catalog[aliasId]) hits.push(catalog[aliasId]);
    var keys = Object.keys(catalog);
    var i;
    for (i = 0; i < keys.length; i++) {
      var e = catalog[keys[i]];
      if (!e) continue;
      var he = normalizeName(e.he);
      if (he === n || foldHe(keys[i]) === folded || foldHe(e.id) === folded || foldHe(e.he) === folded) {
        hits.push(e);
      } else if (HE_NAMES[keys[i]] && normalizeName(HE_NAMES[keys[i]]) === n) {
        hits.push(e);
      }
    }
    if (hits.length) {
      hits.sort(function (a, b) { return sourcePref(b) - sourcePref(a); });
      return hits[0];
    }
    var best = null;
    var bestLen = 0;
    var bestDist = Infinity;
    for (i = 0; i < keys.length; i++) {
      var e2 = catalog[keys[i]];
      if (!e2) continue;
      var he2 = normalizeName(e2.he);
      if (he2.length < 3) continue;
      var nameInQuery = n.indexOf(he2) !== -1;
      var queryInName = he2.indexOf(n) !== -1;
      if (!nameInQuery && !queryInName) continue;
      // Short free-text like "שכיבות" must prefer the closest catalog title,
      // not the longest name that happens to contain the query.
      var dist = Math.abs(he2.length - n.length);
      var better = false;
      if (!best) better = true;
      else if (dist < bestDist) better = true;
      else if (dist === bestDist && sourcePref(e2) > sourcePref(best)) better = true;
      else if (dist === bestDist && sourcePref(e2) === sourcePref(best) && he2.length < bestLen && queryInName) {
        better = true;
      }
      if (better) {
        best = e2;
        bestLen = he2.length;
        bestDist = dist;
      }
    }
    return best;
  }

  function attachCatalogIds(workout) {
    if (!workout || !Array.isArray(workout.phases)) return workout;
    workout.phases.forEach(function (ph) {
      (ph.exercises || []).forEach(function (ex) {
        if (!ex) return;
        if (ex.id && catalog[ex.id]) return;
        var hit = matchCatalog(ex.name);
        if (hit) ex.id = hit.id;
      });
    });
    return workout;
  }

  function hasClip(step) {
    var e = findExercise(step);
    return isPlayable(e);
  }

  function bestMedia(entry) {
    if (!entry) return null;
    if (entry.available !== false && ((entry.file && /^https?:\/\//i.test(entry.file)) || entry.driveId || entry.youtubeId || entry.externalUrl)) return entry;
    var he = foldHe(entry.he);
    if (!he) return entry;
    var keys = Object.keys(catalog);
    var i;
    for (i = 0; i < keys.length; i++) {
      var hosted = catalog[keys[i]];
      if (hosted && hosted.available !== false && hosted.file && /^https?:\/\//i.test(hosted.file) && foldHe(hosted.he) === he) return hosted;
    }
    for (i = 0; i < keys.length; i++) {
      var e = catalog[keys[i]];
      if (e && e.driveId && foldHe(e.he) === he) return e;
    }
    return entry;
  }

  function formatClock(sec) {
    var n = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(n / 60);
    var s = n % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function mediaFallbackText(entry) {
    if (!entry) return 'תרגיל מהמאגר';
    var bits = [entry.he || 'תרגיל'];
    if (entry.folder) bits.push(entry.folder);
    var muscles = (entry.muscles || []).map(muscleLabel).filter(Boolean);
    if (muscles.length) bits.push(muscles.join(', '));
    return bits.join(' · ');
  }

  function mediaMarkup(entry, opts) {
    opts = opts || {};
    var cls = esc(opts.className || 'ex-media');
    if (!entry) return '';
    entry = bestMedia(entry) || entry;
    var fallback = '<div class="' + cls + '-fallback" role="note">' +
      esc(mediaFallbackText(entry)) +
      (playableKind(entry) && playableKind(entry) !== 'file'
        ? '<span class="' + cls + '-offline"> — בלי רשת מוצג שם התרגיל במקום הנגן.</span>'
        : '') +
      '</div>';
    if (entry.available === false) {
      return '<div class="' + cls + '-fallback" role="note">' + esc(mediaFallbackText(entry)) +
        ' — עדיין אין קובץ וידאו מאומת לתרגיל הזה.</div>';
    }
    if (!isOnline() || opts.offline) {
      if (entry.externalUrl) {
        return '<p class="' + cls + '-fallback" role="note">' + esc(mediaFallbackText(entry)) +
          ' — הקישור החיצוני דורש רשת.</p>';
      }
      return fallback;
    }
    if (entry.file) {
      return '<div class="' + cls + '-wrap">' +
        '<video class="' + cls + '" hidden playsinline controls muted preload="metadata" src="' +
        esc(catalogSrc(entry.file)) +
        '" onloadeddata="this.hidden=false" onerror="this.hidden=true;this.nextElementSibling.hidden=false"></video>' +
        '<div class="' + cls + '-fallback" hidden role="note">' + esc(mediaFallbackText(entry)) +
        ' — הסרטון לא זמין כרגע; פרטי התרגיל נשארים מוצגים.</div></div>';
    }
    if (entry.driveId) {
      var segNote = '';
      if (entry.startSec != null && entry.endSec != null) {
        segNote = '<p class="' + cls + '-segment" role="note">מקטע ' +
          esc(formatClock(entry.startSec)) + '–' + esc(formatClock(entry.endSec)) +
          ' — נגן הדרייב מציג את כל הקובץ; דלגו לזמן המסומן.</p>';
      }
      return '<div class="' + cls + '-wrap">' +
        '<div class="' + cls + '-fallback" hidden>' + esc(mediaFallbackText(entry)) + '</div>' +
        '<iframe class="' + cls + '" title="' + esc(entry.he || 'סרטון דרייב') +
        '" src="' + esc(drivePreviewUrl(entry.driveId)) +
        '" allow="autoplay" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
        segNote +
        '</div>';
    }
    if (entry.youtubeId) {
      return '<div class="' + cls + '-wrap">' +
        '<iframe class="' + cls + '" title="' + esc(entry.he || 'סרטון יוטיוב') +
        '" src="' + esc(youtubeEmbedUrl(entry.youtubeId, entry.startSec, entry.endSec)) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>' +
        '</div>';
    }
    if (entry.externalUrl) {
      return '<a class="' + cls + '-link" href="' + esc(entry.externalUrl) +
        '" target="_blank" rel="noopener noreferrer">פתח קישור חיצוני — ' +
        esc(entry.he || 'קישור') + '</a>';
    }
    return fallback;
  }

  function scoreSubstitute(candidate, current) {
    var score = 0;
    var curMuscles = (current && current.muscles) || [];
    var curEq = (current && current.equipment) || [];
    (candidate.muscles || []).forEach(function (m) {
      if (curMuscles.indexOf(m) !== -1) score += 3;
    });
    (candidate.equipment || []).forEach(function (eq) {
      if (curEq.indexOf(eq) !== -1) score += 2;
    });
    if (isPlayable(candidate)) score += 1;
    if (candidate.source === 'drive') score += 1;
    if ((candidate.level || 'beginner') === ((current && current.level) || 'beginner')) score += 1;
    return score;
  }

  function poolEntry(step) {
    var id = step.id || step.name;
    var name = step.name;
    for (var i = 0; i < PROGRAM_POOL.length; i++) {
      var p = PROGRAM_POOL[i];
      if (p.id === id || (name && HE_NAMES[p.id] === name)) return p;
    }
    return null;
  }

  function substitutesFor(step, opts) {
    opts = opts || {};
    var current = findExercise(step);
    if (!current && step && (step.id || step.name) && catalog[step.id || step.name]) {
      current = catalog[step.id || step.name];
    }
    // Built program steps (push_up, dumbbell_bench...) come from PROGRAM_POOL,
    // not the catalog. Without their muscles every «החלף…» in weekly.html and
    // workout-mode offered the same three core clips, whatever the exercise.
    if (!current && step) current = poolEntry(step);
    var muscles = (current && current.muscles) || opts.muscles || [];
    var excludeId = (current && current.id) || (step && (step.id || step.name)) || '';
    var have = opts.equipment;
    // The designated warm-up clip («חימום») is a core clip in the catalog, so
    // it outscored real core alternatives: library.html listed it first under
    // «חלופות» for 22 of 78 cards, and workout-mode / weekly.html offered to
    // swap a Main exercise for it. It stays a Warm-up clip only - unless the
    // step being replaced is the warm-up clip itself. Same rule as catalogAsPool.
    var keepWarmup = isWarmupClip(current);
    // opts.exclude: the other steps already in the same workout. weekly.html
    // offered «החלף…» alternatives that were already in the day, so picking
    // one played the same exercise twice.
    var taken = {};
    (opts.exclude || []).forEach(function (other) {
      if (!other) return;
      var hit = findExercise(other);
      if (hit) taken[hit.id] = true;
      if (other.id) taken[other.id] = true;
      if (other.name) taken[other.name] = true;
    });
    var list = catalogList().filter(function (e) {
      if (!isPlayable(e)) return false;
      if (e.id === excludeId) return false;
      if (taken[e.id] || taken[e.he]) return false;
      if (!keepWarmup && isWarmupDrill(e)) return false;
      if (muscles.length && !e.muscles.some(function (m) { return muscles.indexOf(m) !== -1; })) return false;
      if (Array.isArray(have) && have.length && !userCanDo(e, have)) return false;
      return true;
    });
    list.sort(function (a, b) {
      return scoreSubstitute(b, current) - scoreSubstitute(a, current);
    });
    return list.slice(0, opts.limit || 5);
  }

  // Swapping a rep exercise for a plank turns its reps into a hold: «פלאנק · 8-12 חזרות»
  // means nothing. The hold follows the goal the reps came from (4-6 → 30 s), else 40 s.
  function holdForReps(reps) {
    var goal = Object.keys(GOAL_RX).filter(function (g) { return GOAL_RX[g].reps === String(reps); })[0];
    return GOAL_RX[goal || 'hypertrophy'].hold;
  }

  function applySwap(ex, entry) {
    if (!ex || !entry) return ex;
    var toHold = isHoldExercise(entry.id) && ex.reps != null && ex.duration_seconds == null;
    return {
      name: entry.he,
      id: entry.id,
      sets: ex.sets != null ? ex.sets : null,
      reps: ex.reps != null && !toHold ? ex.reps : null,
      duration_seconds: toHold ? holdForReps(ex.reps) : (ex.duration_seconds != null ? ex.duration_seconds : null),
      rest_seconds: ex.rest_seconds != null ? ex.rest_seconds : (ex.restSeconds != null ? ex.restSeconds : null),
      notes: ex.notes || null
    };
  }

  function swapExercise(workout, phaseIdx, exIdx, newId) {
    if (!workout || !Array.isArray(workout.phases)) return workout;
    var entry = catalog[newId];
    if (!entry) return workout;
    var phase = workout.phases[phaseIdx];
    if (!phase || !Array.isArray(phase.exercises) || !phase.exercises[exIdx]) return workout;
    phase.exercises[exIdx] = applySwap(phase.exercises[exIdx], entry);
    return workout;
  }

  function swapExerciseById(workout, oldIdOrName, newId) {
    if (!workout || !Array.isArray(workout.phases)) return workout;
    var entry = catalog[newId];
    if (!entry) return workout;
    var needle = String(oldIdOrName || '');
    workout.phases.forEach(function (ph) {
      (ph.exercises || []).forEach(function (ex, i) {
        if (!ex) return;
        if (ex.id === needle || ex.name === needle) {
          ph.exercises[i] = applySwap(ex, entry);
        }
      });
    });
    return workout;
  }

  function encodeClip(id, meta) {
    meta = meta || {};
    var entry = catalog[id] || findExercise({ id: id });
    if (!entry) return '';
    var payload = { v: 1, id: entry.id, he: entry.he, wa: meta.wa || '', n: meta.name || '' };
    return workoutModeUrl() + '#CLIP.' + utf8ToB64url(JSON.stringify(payload));
  }

  function decodeClipHash(hash) {
    var raw = String(hash || (typeof location !== 'undefined' ? location.hash : '') || '').replace(/^#/, '');
    if (raw.indexOf('CLIP.') !== 0) return null;
    try {
      var data = JSON.parse(b64urlToUtf8(raw.slice(5)));
      if (!data || !data.id) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clipToWorkout(data) {
    data = data || {};
    var entry = catalog[data.id] || { id: data.id, he: data.he || data.id };
    var hold = isHoldExercise(entry.id || data.id);
    return {
      title: entry.he || data.he || 'תרגיל',
      duration_minutes: 8,
      intensity: 'medium',
      tags: ['clip'],
      phases: [
        { name: 'Warm-up', duration_minutes: 0, exercises: [] },
        {
          name: 'Main',
          duration_minutes: 8,
          exercises: [{
            name: entry.he || data.he || data.id,
            id: entry.id || data.id,
            sets: 3,
            reps: hold ? null : '8-12',
            duration_seconds: hold ? GOAL_RX.hypertrophy.hold : null,
            rest_seconds: 45,
            notes: null
          }]
        },
        { name: 'Cool-down', duration_minutes: 0, exercises: [] }
      ]
    };
  }

  function clipShareMessage(id, name) {
    var entry = catalog[id] || findExercise({ id: id });
    if (!entry) return '';
    var url = encodeClip(id, { name: name || '' });
    var who = name ? ('היי ' + name + ' 💪\n') : '';
    var kind = playableKind(entry);
    var note = 'פותחים בלי הרשמה.';
    if (kind === 'drive') note = 'הסרטון מתנגן מדרייב משותף. בלי רשת יוצג שם התרגיל במקום הנגן.';
    else if (kind === 'youtube') note = 'הסרטון מיוטיוב שנשמר במאגר.';
    else if (kind === 'link') note = 'זה קישור חיצוני שנפתח מחוץ לאפליקציה — לא חיבור למאמנים.';
    else note = 'פותחים בלי הרשמה. אם הנגן לא מופיע — הקובץ אצלך במכשיר, לא בענן.';
    return who + 'הנה הסרטון ל«' + entry.he + '»:\n' + url + '\n\n' + note;
  }

  function daysSinceLast(client) {
    var logs = client && Array.isArray(client.logs) ? client.logs : [];
    if (!logs.length) return null;
    var last = logs.slice().sort(function (a, b) {
      return String(b.at || b.doneAt || '').localeCompare(String(a.at || a.doneAt || ''));
    })[0];
    var t = new Date(last.at || last.doneAt).getTime();
    if (isNaN(t)) return null;
    // Calendar days, like the 28-day grid: a workout done yesterday evening
    // is "1 day ago" this morning, not "today".
    var lastDay = new Date(t);
    lastDay.setHours(0, 0, 0, 0);
    var today = new Date(Date.now());
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - lastDay.getTime()) / 86400000));
  }

  function nudgeMessage(client) {
    client = client || {};
    var name = client.name || 'מתאמן';
    var days = daysSinceLast(client);
    var lastTitle = '';
    if (Array.isArray(client.logs) && client.logs.length) {
      var last = client.logs.slice().sort(function (a, b) {
        return String(b.at || b.doneAt || '').localeCompare(String(a.at || a.doneAt || ''));
      })[0];
      lastTitle = last.title || '';
    }
    // «עבר יום» / «עברו יומיים», not «עברו 1 ימים» in a message the client reads.
    var gap = days === 1 ? 'עבר יום' : (days === 2 ? 'עברו יומיים' : ('עברו ' + days + ' ימים'));
    var when = days == null
      ? 'עדיין לא ראיתי ביצוע מיובא'
      : (days === 0 ? 'ראיתי ביצוע היום' : (gap + ' בלי ביצוע מיובא'));
    return 'היי ' + name + ' 💪\n' + when + (lastTitle ? (' (' + lastTitle + ')') : '') +
      '.\nצריך עזרה עם תרגיל? אפשר לשלוח סרטון מהספרייה.\nכשתסיים — שלח לי את הקוד ממסך הסיום.';
  }

  function draftGet() {
    var w = storeGet(KEYS.draft, null);
    if (w && Array.isArray(w.phases) && w.phases.length) return w;
    return {
      title: 'אימון מהספרייה',
      duration_minutes: 30,
      intensity: 'medium',
      tags: ['library'],
      phases: [
        { name: 'Warm-up', duration_minutes: 5, exercises: [] },
        { name: 'Main', duration_minutes: 20, exercises: [] },
        { name: 'Cool-down', duration_minutes: 5, exercises: [] }
      ]
    };
  }

  var DRAFT_MAIN_MINUTES = 20;

  // Seconds a draft exercise takes in workout mode: its sets of work (a rep
  // is ~3 s, the midpoint of a «8-12» range) plus the rests between them.
  function draftExerciseSeconds(ex) {
    var sets = Math.max(1, Number(ex.sets) || 1);
    var work = Number(ex.duration_seconds) || 0;
    if (!work) {
      var m = String(ex.reps == null ? '' : ex.reps).match(/(\d+)(?:\s*-\s*(\d+))?/);
      var reps = m ? (Number(m[1]) + Number(m[2] || m[1])) / 2 : 0;
      work = reps ? reps * 3 : 30;
    }
    var rest = Number(ex.rest_seconds) || 0;
    return sets * work + (sets - 1) * rest;
  }

  // The draft starts as a 20-minute Main; once the picked clips take longer
  // than that (about 3 min each with the default 3×8-12 and 45 s rest) the
  // phase and the workout total grow with them, so the trainee page and the
  // print sheet do not promise «30 דקות» for a 12-exercise session.
  function draftSettleMinutes(w) {
    var main = w.phases[1] || w.phases[0];
    var seconds = (main.exercises || []).reduce(function (a, ex) { return a + draftExerciseSeconds(ex); }, 0);
    main.duration_minutes = Math.max(DRAFT_MAIN_MINUTES, Math.round(seconds / 60));
    w.duration_minutes = w.phases.reduce(function (a, ph) { return a + (Number(ph.duration_minutes) || 0); }, 0);
    return w;
  }

  function draftHas(id) {
    var w = draftGet();
    var main = w.phases[1] || w.phases[0];
    return (main.exercises || []).some(function (ex) { return ex.id === id; });
  }

  // A clip already in the draft is not pushed again: a double tap on
  // «הוסף לאימון» used to put the same exercise twice in a row.
  function draftAdd(id) {
    var entry = catalog[id];
    if (!entry) return null;
    var w = draftGet();
    var main = w.phases[1] || w.phases[0];
    if (!main.exercises) main.exercises = [];
    if (main.exercises.some(function (ex) { return ex.id === entry.id; })) return w;
    // A plank added from the library is held for seconds, like in the program builder.
    var hold = isHoldExercise(entry.id);
    main.exercises.push({
      name: entry.he,
      id: entry.id,
      sets: 3,
      reps: hold ? null : '8-12',
      duration_seconds: hold ? GOAL_RX.hypertrophy.hold : null,
      rest_seconds: 45,
      notes: null
    });
    draftSettleMinutes(w);
    storeSet(KEYS.draft, w);
    return w;
  }

  function draftClear() {
    storeRemove(KEYS.draft);
  }

  function userCatalogList() {
    var list = storeGet(KEYS.userCatalog, []);
    return Array.isArray(list) ? list : [];
  }

  // Two user entries are the same clip when they share an id or point at the
  // same hosted video. A segment (startSec set) is one slice of a long video:
  // other slices of that video are separate entries, not duplicates of it,
  // so the "פרק סרטון" tab can keep every slice it saves from one Drive file.
  function sameUserClip(a, b) {
    if (!a || !b) return false;
    if (a.id === b.id) return true;
    var sameVideo = (!!a.driveId && a.driveId === b.driveId) ||
      (!!a.youtubeId && a.youtubeId === b.youtubeId);
    if (!sameVideo) return false;
    if (a.startSec == null && b.startSec == null) return true;
    if (a.startSec == null || b.startSec == null) return false;
    return Number(a.startSec) === Number(b.startSec) && Number(a.endSec) === Number(b.endSec);
  }

  function addUserEntry(entry) {
    if (!entry || !entry.id || !entry.he) return null;
    var list = userCatalogList();
    var i;
    for (i = 0; i < list.length; i++) {
      if (sameUserClip(list[i], entry)) {
        list[i] = entry;
        if (!storeSet(KEYS.userCatalog, list)) return null;
        catalog[entry.id] = normalizeEntry(entry.id, entry, entry.source || 'user');
        return entry;
      }
    }
    list.push(entry);
    if (!storeSet(KEYS.userCatalog, list)) return null;
    catalog[entry.id] = normalizeEntry(entry.id, entry, entry.source || 'user');
    return entry;
  }

  function removeUserEntry(id) {
    var list = userCatalogList().filter(function (e) { return e && e.id !== id; });
    storeSet(KEYS.userCatalog, list);
    if (catalog[id] && (catalog[id].source === 'user' || catalog[id].source === 'link' ||
        catalog[id].source === 'youtube')) {
      delete catalog[id];
    }
    return list;
  }

  function exportUserCatalog() {
    return JSON.stringify(userCatalogList(), null, 2);
  }

  function setCatalog(data) {
    catalog = {};
    if (Array.isArray(data)) {
      data.forEach(function (e, i) {
        if (!e) return;
        var id = e.id || ('ex_' + i);
        catalog[id] = normalizeEntry(id, e, e.source || 'local');
      });
    } else if (data && typeof data === 'object') {
      Object.keys(data).forEach(function (id) {
        if (id.charAt(0) === '_') return;
        catalog[id] = normalizeEntry(id, data[id], (data[id] && data[id].source) || 'local');
      });
    }
    catalogReady = true;
    readyWaiters.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function loadJson(rel) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetch(assetUrl(rel)).then(function (r) {
      return r.ok ? r.json() : null;
    }).catch(function () { return null; });
  }

  function loadCatalog() {
    if (catalogReady) return Promise.resolve(catalog);
    return Promise.all([
      loadJson('js/catalog.json'),
      loadJson('videos/drive-catalog.json')
    ]).then(function (pair) {
      var local = pair[0] && typeof pair[0] === 'object' ? pair[0] : {};
      var drive = pair[1] || [];
      setCatalog(mergeCatalogs(local, drive, userCatalogList()));
      return catalog;
    }).catch(function () {
      setCatalog({});
      return catalog;
    });
  }

  function ready(fn) {
    if (catalogReady) { fn(); return; }
    readyWaiters.push(fn);
    loadCatalog();
  }

  // «ריצה 20 דקות» printed as «1 × 1200 שנ׳»: whole minutes read as «20 דק׳»
  // (like the booklet), «90 שנ׳» stays, and one set has no «1 ×».
  function printSeconds(seconds) {
    return seconds >= 60 && seconds % 60 === 0 ? (seconds / 60) + ' דק׳' : seconds + ' שנ׳';
  }

  function exercisePrintRow(ex) {
    ex = ex || {};
    var bits = [];
    if (ex.sets && ex.reps) bits.push(ex.sets + ' × ' + ex.reps);
    else if (ex.sets > 1 && ex.duration_seconds) bits.push(ex.sets + ' × ' + printSeconds(ex.duration_seconds));
    else if (ex.duration_seconds) bits.push(printSeconds(ex.duration_seconds));
    else if (ex.reps) bits.push(ex.reps + ' חזרות');
    // A distance or «עד כשל» row («ספרינט 6x50 מטר», «מתח 3xמקס») has sets
    // but no reps or seconds; the studio card shows «6 סטים», so must the sheet.
    else if (ex.sets > 1) bits.push(ex.sets + ' סטים');
    if (ex.rest_seconds) bits.push('מנוחה ' + printSeconds(ex.rest_seconds));
    var name = ex.name || heName(ex.id) || 'תרגיל';
    var row = {
      name: String(name).replace(/\.mp4/ig, '').trim(),
      detail: bits.join(' · '),
      id: ex.id || ''
    };
    if (ex.notes && String(ex.notes).trim()) {
      row.notes = String(ex.notes).trim();
    }
    return row;
  }

  function workoutPrintModel(workout, opts) {
    opts = opts || {};
    workout = workout || {};
    var ent = entitlement();
    var requestedBrand = sanitizeBrand(opts.brand || ent.brand || '');
    var branded = !!(ent.canBrandedPdf && requestedBrand && opts.branded !== false);
    var phases = (workout.phases || []).map(function (ph) {
      return {
        name: phaseLabel(ph.name),
        exercises: (ph.exercises || []).map(exercisePrintRow)
      };
    });
    // A prompt-built or single-clip workout carries an empty Cool-down (and
    // sometimes Warm-up); printing it gave every sheet a «שחרור» heading over
    // «אין תרגילים בשלב הזה.». Empty phases are left out unless all are empty.
    var filled = phases.filter(function (ph) { return ph.exercises.length; });
    if (filled.length) phases = filled;
    return {
      title: String(workout.title || 'אימון').replace(/\.mp4/ig, '').trim(),
      branded: branded,
      brand: branded ? requestedBrand : '',
      client: sanitizeBrand(opts.client || ''),
      phases: phases,
      footer: branded
        ? 'הוכן על ידי ' + requestedBrand + ' בספריית התרגילים של TrainerHub.'
        : 'גרסת תרגול אישית — לא מיועדת למסירה ללקוח. שיתוף ממותג דורש מסלול מאמן.',
      note: 'אין כאן שמות קבצים. הדפסה או שמירה כ־PDF מהדפדפן, בלי שרת.'
    };
  }

  function workoutPrintHtml(model) {
    model = model || workoutPrintModel({}, {});
    var phases = (model.phases || []).map(function (ph) {
      var rows = (ph.exercises || []).map(function (ex) {
        var note = ex.notes ? ('<td>' + esc(ex.notes) + '</td>') : '';
        return '<tr><th scope="row">' + esc(ex.name) + '</th><td>' + esc(ex.detail || '') + '</td>' + note + '</tr>';
      }).join('');
      return '<section class="print-phase"><h2>' + esc(ph.name) + '</h2><table>' +
        (rows || '<tr><td>אין תרגילים בשלב הזה.</td></tr>') + '</table></section>';
    }).join('');
    var brandLine = model.branded && model.brand
      ? '<p class="print-brand">' + esc(model.brand) + '</p>'
      : '';
    var mark = model.branded ? '' : '<p class="print-watermark">תרגול — לא למסירה ללקוח</p>';
    return '<article class="print-sheet" dir="rtl" lang="he">' +
      brandLine +
      '<h1>' + esc(model.title) + '</h1>' +
      (model.client ? '<p class="print-client">עבור: ' + esc(model.client) + '</p>' : '') +
      phases +
      mark +
      '<footer class="print-footer"><p>' + esc(model.footer) + '</p><p>' + esc(model.note) + '</p></footer>' +
      '</article>';
  }

  // ---- Monthly client report (printed by workout-print.html) -------------
  var HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  function monthKey(v) {
    var m = /^(\d{4})-(\d{2})/.exec(String(v || ''));
    if (m) return m[1] + '-' + m[2];
    var d = v instanceof Date ? v : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function localMonthOf(at) {
    var d = new Date(at);
    if (isNaN(d.getTime())) return String(at || '').slice(0, 7);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // client: a journal client ({name, logs[], measurements[], days[], plan});
  // opts.entries: journal-storage entries for that client (sets with weightKg).
  function monthlyReportModel(client, opts) {
    client = client || {};
    opts = opts || {};
    var month = monthKey(opts.month);
    var y = Number(month.slice(0, 4)), mo = Number(month.slice(5, 7));
    var logs = (Array.isArray(client.logs) ? client.logs : []).filter(function (l) { return localMonthOf(l.at || l.doneAt) === month; })
      .sort(function (a, b) { return String(a.at || a.doneAt || '').localeCompare(String(b.at || b.doneAt || '')); });
    var minutes = logs.reduce(function (n, l) { return n + (Number(l.minutes) || 0); }, 0);
    var rpes = logs.filter(function (l) { return l.rpe != null && isFinite(Number(l.rpe)); }).map(function (l) { return Number(l.rpe); });
    var avgRpe = rpes.length ? Math.round(rpes.reduce(function (a, b) { return a + b; }, 0) / rpes.length * 10) / 10 : null;
    // Planned sessions: weekdays in client.days falling in the month (up to today for the current month).
    var daysInMonth = new Date(y, mo, 0).getDate();
    var today = opts.now ? new Date(opts.now) : new Date();
    var planned = 0;
    var wd = Array.isArray(client.days) ? client.days.map(Number) : [];
    if (wd.length) {
      for (var d = 1; d <= daysInMonth; d++) {
        var dt = new Date(y, mo - 1, d);
        if (dt > today) break;
        if (wd.indexOf(dt.getDay()) !== -1) planned++;
      }
    }
    var adherence = planned ? Math.min(100, Math.round(logs.length / planned * 100)) : null;
    var meas = (Array.isArray(client.measurements) ? client.measurements : []).filter(function (m) { return localMonthOf(m.at) === month && m.weightKg != null; })
      .sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
    var best = {};
    (Array.isArray(opts.entries) ? opts.entries : []).forEach(function (e) {
      if (localMonthOf(e.doneAt || e.at || e.createdAt) !== month) return;
      (e.sets || []).forEach(function (st) {
        var w = Number(st.weightKg) || 0;
        var id = st.exerciseId || st.name;
        if (!id || !w) return;
        if (!best[id] || w > best[id].weightKg || (w === best[id].weightKg && (Number(st.reps) || 0) > best[id].reps)) best[id] = { id: id, weightKg: w, reps: Number(st.reps) || 0 };
      });
    });
    var tops = Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.weightKg - a.weightKg; }).slice(0, 8);
    return {
      kind: 'monthly',
      month: month,
      title: 'דוח חודשי · ' + HE_MONTHS[mo - 1] + ' ' + y,
      client: sanitizeBrand(client.name || 'מתאמן'),
      plan: client.plan || '',
      sessions: logs.length,
      planned: planned,
      adherence: adherence,
      minutes: minutes,
      avgRpe: avgRpe,
      weightStart: meas.length ? meas[0].weightKg : null,
      weightEnd: meas.length ? meas[meas.length - 1].weightKg : null,
      bests: tops.map(function (t) { return { name: exerciseLabel(t.id), weightKg: t.weightKg, reps: t.reps }; }),
      logs: logs.map(function (l) {
        return { day: String(l.at || l.doneAt || '').slice(0, 10), title: l.title || 'אימון', minutes: Number(l.minutes) || null, rpe: l.rpe != null ? Number(l.rpe) : null };
      })
    };
  }

  function exerciseLabel(id) {
    if (HE_NAMES[id]) return HE_NAMES[id];
    if (catalog[id] && catalog[id].he) return catalog[id].he;
    return String(id).replace(/_/g, ' ');
  }

  function monthlyReportHtml(model, opts) {
    model = model || monthlyReportModel({}, {});
    opts = opts || {};
    var ent = entitlement();
    var brand = sanitizeBrand(opts.brand || ent.brand || '');
    var branded = !!(ent.canBrandedPdf && brand);
    var fmt = function (n) { return n == null ? '—' : String(n); };
    var stat = function (label, val) { return '<tr><th scope="row">' + esc(label) + '</th><td>' + esc(val) + '</td></tr>'; };
    var weight = model.weightStart == null ? '—'
      : (model.weightStart === model.weightEnd ? model.weightEnd + ' ק״ג'
        : model.weightStart + ' → ' + model.weightEnd + ' ק״ג (' + (model.weightEnd - model.weightStart > 0 ? '+' : '') + (Math.round((model.weightEnd - model.weightStart) * 10) / 10) + ')');
    var summary = '<section class="print-phase" data-role="report-summary"><h2>סיכום</h2><table>' +
      stat('אימונים שבוצעו', model.sessions + (model.planned ? ' מתוך ' + model.planned + ' מתוכננים' : '')) +
      stat('התמדה', model.adherence == null ? '—' : model.adherence + '%') +
      stat('דקות אימון', fmt(model.minutes)) +
      stat('קושי ממוצע', model.avgRpe == null ? '—' : model.avgRpe + '/5') +
      stat('משקל גוף', weight) +
      '</table></section>';
    var bests = '<section class="print-phase" data-role="report-bests"><h2>שיאי החודש</h2><table>' +
      (model.bests.length ? model.bests.map(function (b) { return '<tr><th scope="row">' + esc(b.name) + '</th><td>' + esc(b.weightKg + ' ק״ג' + (b.reps ? ' × ' + b.reps : '')) + '</td></tr>'; }).join('')
        : '<tr><td>אין סטים עם משקל בחודש הזה.</td></tr>') + '</table></section>';
    var logs = '<section class="print-phase" data-role="report-logs"><h2>יומן החודש</h2><table>' +
      (model.logs.length ? model.logs.map(function (l) { return '<tr><th scope="row">' + esc(l.day) + '</th><td>' + esc(l.title) + '</td><td>' + esc((l.minutes ? l.minutes + ' דק׳' : '') + (l.rpe != null ? ' · קושי ' + l.rpe + '/5' : '')) + '</td></tr>'; }).join('')
        : '<tr><td>לא יובאו ביצועים בחודש הזה.</td></tr>') + '</table></section>';
    return '<article class="print-sheet" dir="rtl" lang="he" data-kind="monthly">' +
      (branded ? '<p class="print-brand">' + esc(brand) + '</p>' : '') +
      '<h1>' + esc(model.title) + '</h1>' +
      '<p class="print-client">עבור: ' + esc(model.client) + (model.plan ? ' · ' + esc(model.plan) : '') + '</p>' +
      summary + bests + logs +
      (branded ? '' : '<p class="print-watermark">תרגול — לא למסירה ללקוח</p>') +
      '<footer class="print-footer"><p>' + esc(branded ? 'הוכן על ידי ' + brand + ' ב-TrainerHub.' : 'גרסת תרגול — דוח ממותג ללקוח דורש מסלול מאמן.') + '</p><p>הנתונים מהיומן בדפדפן הזה בלבד. הדפסה או שמירה כ־PDF מהדפדפן, בלי שרת.</p></footer>' +
      '</article>';
  }

  // Same print key; a later preparePrint (workout) replaces the report.
  function prepareMonthlyReport(client, opts) {
    var prev = storeGet(KEYS.print, null);
    var model = monthlyReportModel(client, opts);
    storeSet(KEYS.print, { workout: (prev && prev.workout) || null, brand: (prev && prev.brand) || '', client: model.client, report: model });
    return { model: model, url: printUrl() };
  }

  // ---- Local reminders (Notification API, no server/push) -----------------
  function todayKey(now) {
    var d = now ? new Date(now) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Clients with a training day today and no imported log today.
  function dueReminders(clients, now) {
    var d = now ? new Date(now) : new Date();
    var key = todayKey(d);
    return (Array.isArray(clients) ? clients : []).filter(function (c) {
      if (!c || !Array.isArray(c.days) || c.days.map(Number).indexOf(d.getDay()) === -1) return false;
      return !(c.logs || []).some(function (l) { return todayKey(l.at || l.doneAt) === key; });
    }).map(function (c) {
      return { id: c.id, name: c.name || 'מתאמן', title: 'היום אימון: ' + (c.name || 'מתאמן'), body: (c.plan ? '«' + c.plan + '» · ' : '') + 'עוד לא יובא ביצוע היום. אפשר לשלוח תזכורת בוואטסאפ מהיומן.' };
    });
  }

  function reminderPrefs() {
    var p = storeGet(KEYS.workoutPrefs, null) || {};
    return { on: !!p.remind, last: p.remindedOn || '' };
  }

  function setReminderPrefs(patch) {
    var p = storeGet(KEYS.workoutPrefs, null) || {};
    if (patch.on != null) p.remind = !!patch.on;
    if (patch.last != null) p.remindedOn = String(patch.last);
    storeSet(KEYS.workoutPrefs, p);
    return reminderPrefs();
  }

  // Shows at most one batch per day. Returns {shown, reason}.
  function runReminders(clients, opts) {
    opts = opts || {};
    var N = opts.Notification || root.Notification;
    var prefs = reminderPrefs();
    if (!prefs.on) return { shown: 0, reason: 'off' };
    if (!N) return { shown: 0, reason: 'unsupported' };
    if (N.permission !== 'granted') return { shown: 0, reason: 'permission' };
    var key = todayKey(opts.now);
    if (prefs.last === key && !opts.force) return { shown: 0, reason: 'already' };
    var due = dueReminders(clients, opts.now);
    due.forEach(function (r) {
      try { new N(r.title, { body: r.body, tag: 'th-remind-' + r.id + '-' + key, lang: 'he', dir: 'rtl' }); } catch (e) { /* mobile needs SW */ }
    });
    setReminderPrefs({ last: key });
    return { shown: due.length, reason: due.length ? 'ok' : 'none' };
  }

  // The name typed in «עדכן שם» on the print page is kept: every «דף להדפסה»
  // button calls this without a brand, and writing '' over it sent a trainer
  // whose access code carries no brand back to a watermarked sheet each time.
  // The client name (journal's «דף להדפסה / PDF עבור …») belongs to this one
  // workout, so unlike the brand it is not carried over to the next print.
  function preparePrint(workout, opts) {
    opts = opts || {};
    var prev = storeGet(KEYS.print, null);
    var brand = opts.brand != null ? opts.brand : (prev && prev.brand) || '';
    storeSet(KEYS.print, { workout: workout || {}, brand: sanitizeBrand(brand), client: sanitizeBrand(opts.name || '') });
    return { model: workoutPrintModel(workout, opts), url: printUrl() };
  }

  function createWorkoutSession(workoutPlan) {
    if (!SessionTracker || typeof SessionTracker.createSession !== 'function') return null;
    return SessionTracker.createSession(workoutPlan);
  }

  function saveWorkoutSession(sessionState) {
    if (!sessionState || !Array.isArray(sessionState.exercises)) return false;
    return storeSet(KEYS.activeSession, sessionState);
  }

  function loadWorkoutSession() {
    return storeGet(KEYS.activeSession, null);
  }

  function painOf(log) {
    if (!log) return false;
    var p = log.pain;
    if (p === true) return true;
    if (typeof p === 'number') return p >= 3;
    if (typeof p === 'string') return /^(1|true|yes|כן)$/i.test(p.trim()) || Number(p) >= 3;
    return false;
  }

  // Per-exercise RPE from an imported TH1 detail (log.ex, 1–10 scale).
  function exerciseRpeMap(log) {
    var map = {};
    (log && Array.isArray(log.ex) ? log.ex : []).forEach(function (e) {
      if (e && e.id && e.rpe != null && isFinite(Number(e.rpe))) map[e.id] = Number(e.rpe);
    });
    return map;
  }

  // opts (optional): { plan, week } — a periodization plan from periodizePlan
  // and the 1-based week just trained; the result then carries the adjusted plan.
  function suggestNextFromLog(compact, lastLog, opts) {
    lastLog = lastLog || {};
    opts = opts || {};
    var pain = painOf(lastLog);
    var hard = pain || (lastLog.rpe != null && Number(lastLog.rpe) >= 4) || (Number(lastLog.skipped) || 0) >= 2;
    var easy = !pain && lastLog.rpe != null && Number(lastLog.rpe) <= 2 && !(Number(lastLog.skipped) || 0);
    var exRpe = exerciseRpeMap(lastLog);
    var decisions = [];
    var next;
    try {
      next = JSON.parse(JSON.stringify(compact || {}));
    } catch (e) {
      next = {};
    }
    if (!Array.isArray(next.p)) next.p = [];
    next.p.forEach(function (ph) {
      if (!ph || ph.n !== 'Main') return;
      // The floor of 2 and the cap of 5 only stop the step; they never move a
      // set count the other way. A 1-set exercise (a short session's Main) went
      // up to 2 after a hard log under «הורדתי סט», and 6 sets went down to 5
      // after an easy one under «הוספתי סט».
      (ph.e || []).forEach(function (ex) {
        if (!ex || ex.s == null) return;
        var s = Number(ex.s);
        var r = ex.id != null ? exRpe[ex.id] : undefined;
        var down = hard || (r != null && r >= 9);
        var up = !down && (easy || (r != null && r <= 5 && !hard && lastLog.rpe == null));
        if (down) ex.s = Math.min(s, Math.max(2, s - 1));
        else if (up) ex.s = Math.max(s, Math.min(5, s + 1));
        if (r != null || pain) {
          decisions.push({
            id: ex.id || ex.n,
            from: s,
            to: ex.s,
            why: pain ? 'דווח על כאב — לא מעלים נפח ב«' + (ex.n || ex.id) + '»'
              : r >= 9 ? 'קושי ' + r + '/10 ב«' + (ex.n || ex.id) + '» — סט אחד פחות'
              : (ex.s > s ? 'קושי ' + r + '/10 ב«' + (ex.n || ex.id) + '» — יש מקום לסט נוסף' : 'קושי ' + r + '/10 ב«' + (ex.n || ex.id) + '» — נשאר אותו נפח')
          });
        }
      });
    });
    // The suggested plan comes back as the next week's lastPlan, so the suffix
    // must not stack up week after week.
    next.t = String(next.t || 'אימון').replace(/(\s*·\s*שבוע הבא)+\s*$/, '') + ' · שבוע הבא';
    var out = {
      compact: next,
      workout: expandPlan(next),
      adjusted: hard ? 'down' : (easy ? 'up' : 'same'),
      why: pain
        ? 'הורדתי סט — דווח על כאב'
        : hard
        ? 'הורדתי סט — היו דילוגים או קושי גבוה'
        : (easy ? 'הוספתי סט — הביצוע היה קל ונקי' : 'השארתי נפח — אין אות ברור'),
      decisions: decisions
    };
    if (opts.plan && opts.week) {
      out.plan = adjustNextWeek(opts.plan, opts.week, { rpe: lastLog.rpe, skipped: lastLog.skipped, pain: pain });
    }
    return out;
  }

  // ---- Periodization (4–12 weeks) ----------------------------------------
  // Weekly blocks of three loading weeks and one deload. The plan only holds
  // numbers per week; applyPlanWeek turns a week into the same phases workout.
  var MOVE_OF_MUSCLE = { chest: 'push', shoulders: 'push', triceps: 'push', back: 'pull', biceps: 'pull', legs: 'legs' };

  function movementOf(ex) {
    var id = ex && (ex.id || ex.name);
    if (!id) return 'other';
    for (var i = 0; i < PROGRAM_POOL.length; i++) {
      if (PROGRAM_POOL[i].id === id) {
        var ms = PROGRAM_POOL[i].muscles || [];
        for (var j = 0; j < ms.length; j++) if (MOVE_OF_MUSCLE[ms[j]]) return MOVE_OF_MUSCLE[ms[j]];
        return 'other';
      }
    }
    var t = String(id) + ' ' + String((ex && ex.name) || '');
    if (/squat|lunge|deadlift|leg|calf|glute|step|סקוואט|לאנג|רגל|ישבן|דדליפט/i.test(t)) return 'legs';
    if (/row|pull|chin|curl|חתיר|משיכ|מתח|כפיפ/i.test(t)) return 'pull';
    if (/push|press|bench|dip|fly|לחיצ|שכיב|מקבילים/i.test(t)) return 'push';
    return 'other';
  }

  var MOVE_LABELS = { push: 'דחיפה', pull: 'משיכה', legs: 'רגליים' };

  // Sets per movement across every day's main phase of a weekly program.
  function pplBalance(program) {
    var tally = { push: 0, pull: 0, legs: 0 };
    ((program && program.dailyWorkouts) || []).forEach(function (d) {
      (d.phases || []).forEach(function (ph) {
        if (!/^main$/i.test(String(ph.name || ''))) return;
        (ph.exercises || []).forEach(function (ex) {
          var m = movementOf(ex);
          if (tally[m] != null) tally[m] += Number(ex.sets) || 1;
        });
      });
    });
    var keys = ['push', 'pull', 'legs'];
    var max = Math.max(tally.push, tally.pull, tally.legs);
    var low = keys.filter(function (k) { return max > 0 && tally[k] < max * 0.6; });
    var why;
    if (!max) why = 'אין תרגילי כוח מרכזיים למדידת איזון.';
    else if (!low.length) why = 'איזון טוב: דחיפה ' + tally.push + ' · משיכה ' + tally.pull + ' · רגליים ' + tally.legs + ' סטים בשבוע.';
    else why = 'חוסר איזון: ' + low.map(function (k) { return MOVE_LABELS[k] + ' (' + tally[k] + ')'; }).join(', ') +
      ' מתחת ל-60% מהקבוצה המובילה (' + max + ' סטים). מומלץ להוסיף סט לתרגילי ' + low.map(function (k) { return MOVE_LABELS[k]; }).join(' / ') + ' או להחליף תרגיל.';
    return { push: tally.push, pull: tally.pull, legs: tally.legs, balanced: !!max && !low.length, low: low, why: why };
  }

  function planWeek(n, kind, loadPct, setsDelta, why) {
    return { week: n, kind: kind, loadPct: loadPct, setsDelta: setsDelta, why: why, adjusted: false };
  }

  function periodizePlan(opts) {
    opts = opts || {};
    var weeks = Math.min(12, Math.max(4, Math.floor(Number(opts.weeks) || 4)));
    var step = opts.goal === 'endurance' ? 2.5 : 5;
    var out = [];
    var level = 100;
    for (var n = 1; n <= weeks; n++) {
      var inBlock = (n - 1) % 4; // 0,1,2 load · 3 deload
      if (inBlock === 3) {
        out.push(planWeek(n, 'deload', 60, -0.4, 'שבוע פריקה: 60% עומס ו-40% פחות סטים — התאוששות אחרי 3 שבועות העמסה.'));
        continue;
      }
      if (n > 1) level += step;
      var extra = inBlock === 2 ? 1 : 0;
      out.push(planWeek(n, 'load', level, extra, n === 1
        ? 'שבוע בסיס: 100% עומס — מודדים את נקודת הפתיחה.'
        : 'העמסה הדרגתית: +' + step + '% עומס' + (extra ? ' וסט נוסף — שבוע שיא לפני פריקה.' : ' לעומת השבוע הקודם.')));
    }
    return { weeks: out, total: weeks, step: step };
  }

  // actual: { rpe (1–5), skipped, pain } for the week just trained (1-based).
  function adjustNextWeek(plan, week, actual) {
    var p = JSON.parse(JSON.stringify(plan || { weeks: [] }));
    actual = actual || {};
    var idx = Math.floor(Number(week) || 0); // index of the next week (0-based) === week
    var next = p.weeks[idx];
    if (!next) return p;
    var cur = p.weeks[idx - 1] || { loadPct: 100 };
    var pain = painOf(actual);
    var skipped = Number(actual.skipped) || 0;
    var rpe = actual.rpe != null && actual.rpe !== '' ? Number(actual.rpe) : null;
    var shift = 0;
    if (pain) {
      next.kind = 'deload'; next.loadPct = 60; next.setsDelta = -0.4;
      next.why = 'דווח על כאב בשבוע ' + week + ' — הוקדם שבוע פריקה (60%) ומומלץ לבדוק את מקור הכאב לפני שחוזרים להעמיס.';
      shift = -(p.step || 5);
    } else if (next.kind === 'deload') {
      next.why += rpe != null || skipped ? ' (נשמר לפי התוכנית)' : '';
    } else if (cur.kind !== 'deload' && (skipped >= 2 || (rpe != null && rpe >= 4))) {
      shift = cur.loadPct - next.loadPct;
      next.loadPct = cur.loadPct;
      next.setsDelta = 0;
      next.why = (skipped >= 2 ? skipped + ' אימונים דולגו' : 'קושי ' + rpe + '/5') + ' בשבוע ' + week + ' — חוזרים על אותו עומס (' + next.loadPct + '%) במקום להעלות.';
    } else if (rpe != null && rpe <= 2 && !skipped) {
      next.loadPct += 2.5; shift = 2.5;
      next.why = 'שבוע ' + week + ' היה קל ונקי (קושי ' + rpe + '/5) — מעלים 2.5% נוספים ל-' + next.loadPct + '%.';
    } else {
      next.why += ' (לפי התוכנית — הביצוע תאם)';
    }
    next.adjusted = true;
    if (shift) {
      for (var i = idx + 1; i < p.weeks.length; i++) {
        if (p.weeks[i].kind === 'deload') break; // the block's deload resets the shift
        p.weeks[i].loadPct = Math.max(60, p.weeks[i].loadPct + shift);
      }
    }
    return p;
  }

  // Same phases schema: only main-phase sets/notes change.
  function applyPlanWeek(workout, wk) {
    var w = JSON.parse(JSON.stringify(workout || {}));
    if (!wk) return w;
    (w.phases || []).forEach(function (ph) {
      if (!/^main$/i.test(String(ph.name || ''))) return;
      (ph.exercises || []).forEach(function (ex) {
        if (ex.sets == null) return;
        var s = Number(ex.sets) || 1;
        ex.sets = wk.setsDelta < 0 ? Math.max(1, Math.round(s * (1 + wk.setsDelta))) : s + (wk.setsDelta || 0);
        var note = 'שבוע ' + wk.week + ': ' + wk.loadPct + '% עומס';
        ex.notes = ex.notes ? ex.notes + ' · ' + note : note;
      });
    });
    w.title = String(w.title || 'אימון').replace(/\s*·\s*שבוע \d+$/, '') + ' · שבוע ' + wk.week;
    return w;
  }

  // The workout rules live in their own module. Resolved on call, not on load,
  // because core.js is the first script on the page.
  function rulesModule() {
    if (root.THRules) return root.THRules;
    if (typeof module === 'object' && module.exports) return require('./rules-with-sources.js');
    return null;
  }

  function rulesWithSources(input) {
    var mod = rulesModule();
    return mod ? mod.rulesWithSources(input) : { description: '', request: null, rules: [], sources: [] };
  }

  function findRule(input, query) {
    var mod = rulesModule();
    return mod ? mod.findRule(input, query) : null;
  }

  function rulesMarkup(input, opts) {
    var mod = rulesModule();
    return mod ? mod.rulesMarkup(input, opts) : '';
  }

  var api = {
    KEYS: KEYS,
    PHASE_LABELS: PHASE_LABELS,
    MUSCLE_LABELS: MUSCLE_LABELS,
    EQ_LABELS: EQ_LABELS,
    TAG_LABELS: TAG_LABELS,
    esc: esc,
    durationLabel: durationLabel,
    store: { get: storeGet, set: storeSet, remove: storeRemove },
    assetUrl: assetUrl,
    heName: heName,
    findExercise: findExercise,
    catalogSrc: catalogSrc,
    phaseLabel: phaseLabel,
    toPhasesWorkout: toPhasesWorkout,
    workoutVolume: workoutVolume,
    compactPlan: compactPlan,
    expandPlan: expandPlan,
    encodeLink: encodeLink,
    shareToClient: shareToClient,
    gateMarkup: gateMarkup,
    copyText: copyText,
    copyOrShow: copyOrShow,
    manualCopyMarkup: manualCopyMarkup,
    offerUrl: offerUrl,
    printUrl: printUrl,
    hashAccessCode: hashAccessCode,
    sanitizeBrand: sanitizeBrand,
    entitlement: entitlement,
    setEntitlement: setEntitlement,
    clearEntitlement: clearEntitlement,
    redeemAccessCode: redeemAccessCode,
    workoutPrintModel: workoutPrintModel,
    workoutPrintHtml: workoutPrintHtml,
    monthlyReportModel: monthlyReportModel,
    monthlyReportHtml: monthlyReportHtml,
    prepareMonthlyReport: prepareMonthlyReport,
    dueReminders: dueReminders,
    reminderPrefs: reminderPrefs,
    setReminderPrefs: setReminderPrefs,
    runReminders: runReminders,
    preparePrint: preparePrint,
    createWorkoutSession: createWorkoutSession,
    saveWorkoutSession: saveWorkoutSession,
    loadWorkoutSession: loadWorkoutSession,
    SessionTracker: SessionTracker,
    suggestNextFromLog: suggestNextFromLog,
    periodizePlan: periodizePlan,
    adjustNextWeek: adjustNextWeek,
    applyPlanWeek: applyPlanWeek,
    pplBalance: pplBalance,
    movementOf: movementOf,
    rulesWithSources: rulesWithSources,
    findRule: findRule,
    rulesMarkup: rulesMarkup,
    decodeHash: decodeHash,
    encodeResult: encodeResult,
    qrMatrix: qrMatrix,
    qrSvg: qrSvg,
    shareQrMarkup: shareQrMarkup,
    decodeResult: decodeResult,
    waShareUrl: waShareUrl,
    workoutModeUrl: workoutModeUrl,
    generateWorkoutProgram: generateWorkoutProgram,
    loadCatalog: loadCatalog,
    setCatalog: setCatalog,
    ready: ready,
    muscleLabel: muscleLabel,
    eqLabel: eqLabel,
    tagLabel: tagLabel,
    catalogTags: catalogTags,
    catalogStats: catalogStats,
    catalogList: catalogList,
    filterCatalog: filterCatalog,
    matchCatalog: matchCatalog,
    attachCatalogIds: attachCatalogIds,
    hasClip: hasClip,
    substitutesFor: substitutesFor,
    swapExercise: swapExercise,
    swapExerciseById: swapExerciseById,
    encodeClip: encodeClip,
    decodeClipHash: decodeClipHash,
    clipToWorkout: clipToWorkout,
    clipShareMessage: clipShareMessage,
    nudgeMessage: nudgeMessage,
    daysSinceLast: daysSinceLast,
    draftGet: draftGet,
    draftAdd: draftAdd,
    draftHas: draftHas,
    draftClear: draftClear,
    isPlayable: isPlayable,
    playableKind: playableKind,
    drivePreviewUrl: drivePreviewUrl,
    youtubeEmbedUrl: youtubeEmbedUrl,
    isOnline: isOnline,
    mediaMarkup: mediaMarkup,
    mediaFallbackText: mediaFallbackText,
    bestMedia: bestMedia,
    mergeCatalogs: mergeCatalogs,
    normalizeEntry: normalizeEntry,
    userCatalogList: userCatalogList,
    addUserEntry: addUserEntry,
    removeUserEntry: removeUserEntry,
    exportUserCatalog: exportUserCatalog,
    parseRepsNumber: parseRepsNumber,
    workoutPrefs: workoutPrefs,
    setWorkoutPrefs: setWorkoutPrefs,
    nextExerciseSpeech: nextExerciseSpeech,
    speakHebrew: speakHebrew,
    restEndCue: restEndCue,
    primeAudio: primeAudio,
    CLIENT_GOALS: CLIENT_GOALS,
    CLIENT_LEVELS: CLIENT_LEVELS,
    WEEKDAYS_HE: WEEKDAYS_HE,
    normalizeClientDetails: normalizeClientDetails,
    setClientDetails: setClientDetails,
    addMeasurement: addMeasurement,
    clientDetailsText: clientDetailsText,
    collectBackup: collectBackup,
    encryptBackup: encryptBackup,
    decryptBackup: decryptBackup,
    restoreBackup: restoreBackup,
    get catalog() { return catalog; }
  };

  root.TH = api;
  root.ThLink = {
    encodeLink: encodeLink,
    shareToClient: shareToClient,
    decodeHash: decodeHash,
    encodeResult: encodeResult,
    qrMatrix: qrMatrix,
    qrSvg: qrSvg,
    shareQrMarkup: shareQrMarkup,
    decodeResult: decodeResult,
    compactPlan: compactPlan,
    expandPlan: expandPlan,
    workoutModeUrl: workoutModeUrl,
    waShareUrl: waShareUrl,
    encodeClip: encodeClip,
    decodeClipHash: decodeClipHash,
    clipToWorkout: clipToWorkout,
    clipShareMessage: clipShareMessage
  };
  root.esc = esc;

  function readyWorkouts() {
    return root.THReadyWorkouts || null;
  }
  api.readyWorkouts = readyWorkouts;

  if (typeof module === 'object' && module.exports) {
    try {
      api.readyWorkouts = require('./ready-workouts.js');
    } catch (e) {}
    Object.defineProperty(api, 'journalStorage', {
      enumerable: true,
      get: function () {
        return require('./journal-storage.js');
      }
    });
    module.exports = api;
  }

  if (typeof document !== 'undefined') loadCatalog();
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
