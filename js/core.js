/**
 * TrainerHub shared core — classic script, no bundler.
 * Loaded by the weekly builder, Creator Studio, and workout-mode.
 * Namespace: window.TH  (ThLink kept as an alias).
 */
(function (root) {
  'use strict';

  var KEYS = {
    active: 'trainerhub_active_workout',
    saved: 'trainerhub_workouts',
    clients: 'trainerhub_clients',
    user: 'trainerhub_user',
    draft: 'trainerhub_draft_workout'
  };

  var PHASE_LABELS = { 'Warm-up': 'חימום', 'Main': 'עיקר', 'Cool-down': 'שחרור' };
  var BODY_PARTS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];
  var GOAL_RX = {
    strength: { sets: 4, reps: '4-6', rest: 120 },
    hypertrophy: { sets: 3, reps: '8-12', rest: 60 },
    endurance: { sets: 3, reps: '12-15', rest: 45 }
  };
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
    'שכיבות שמיכה': 'אתגר_שכיבות_שמיכה'
  };

  var catalog = {};
  var catalogReady = false;
  var readyWaiters = [];

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
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function storeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function assetUrl(rel) {
    var path = (root.location && location.pathname) || '';
    if (/\/frontend(\/|$)/.test(path)) return '../' + rel.replace(/^\.\//, '');
    return './' + rel.replace(/^\.\//, '');
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
        file: e.file || ''
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
    if (id && catalog[id] && catalog[id].file) return catalog[id];
    var name = step.name;
    var keys = Object.keys(catalog);
    for (var i = 0; i < keys.length; i++) {
      var entry = catalog[keys[i]];
      if (!entry || !entry.file) continue;
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
        duration_minutes: d.duration_minutes || 45,
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
    return {
      title: d.title || ('אימון ' + (d.day || '')),
      duration_minutes: 45,
      participants: 1,
      equipment: meta.equipment || [],
      intensity: meta.intensity || 'medium',
      tags: meta.tags || ['program'],
      phases: [
        { name: 'Warm-up', duration_minutes: 5, exercises: warm },
        { name: 'Main', duration_minutes: 35, exercises: mainEx },
        { name: 'Cool-down', duration_minutes: 5, exercises: cool }
      ]
    };
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
              notes: null
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
    return here.replace(/\/index\.html$/i, '').replace(/\/?$/, '/') + 'frontend/workout-mode.html';
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
      plan: obj.pl || obj.plan || null
    };
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
    var intl = digits;
    if (intl.charAt(0) === '0') intl = '972' + intl.slice(1);
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
    if (isSenior) return { sets: Math.min(base.sets, 3), reps: base.reps, rest: Math.max(base.rest, 90) };
    return { sets: base.sets, reps: base.reps, rest: base.rest };
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
    var list = candidates.slice();
    if (opts.audience === 'kids' || opts.audience === 'sport') {
      var tagged = list.filter(function (ex) {
        return (ex.tags || []).indexOf(opts.audience) !== -1;
      });
      if (tagged.length) list = tagged;
    }
    if (opts.preferClips) {
      var clipped = list.filter(function (ex) { return ex.hasClip; });
      if (clipped.length) list = clipped;
    }
    return list;
  }

  function pickExercises(dayIndex, muscles, pool, count, rx, notes, opts) {
    opts = opts || {};
    var used = {};
    var exercises = [];
    var slot = 0;
    var guard = 0;
    while (exercises.length < count && guard < 48) {
      var muscle = muscles[slot % muscles.length];
      var candidates = rankCandidates(pool.filter(function (ex) {
        return !used[ex.id] && ex.muscles.indexOf(muscle) !== -1;
      }), opts);
      if (candidates.length) {
        var pick = candidates[(dayIndex + slot) % candidates.length];
        used[pick.id] = true;
        exercises.push({ name: pick.id, sets: rx.sets, reps: rx.reps, restSeconds: rx.rest, rest_seconds: rx.rest, notes: notes });
      }
      slot++;
      guard++;
      if (slot > muscles.length && candidates.length === 0 && exercises.length === 0) {
        var fallback = rankCandidates(pool.filter(function (ex) { return !used[ex.id]; }), opts);
        if (!fallback.length) break;
        var fb = fallback[dayIndex % fallback.length];
        used[fb.id] = true;
        exercises.push({ name: fb.id, sets: rx.sets, reps: rx.reps, restSeconds: rx.rest, rest_seconds: rx.rest, notes: notes });
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
      var copy = { id: ex.id, muscles: ex.muscles, equipment: ex.equipment };
      seenIds[ex.id] = true;
      if (catalog[ex.id] && catalog[ex.id].file) {
        copy.hasClip = true;
        copy.tags = catalogTags(catalog[ex.id]);
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
    var noteParts = [];
    if (isSenior) noteParts.push('low intensity');
    if (isNew) noteParts.push('focus on form');
    var notes = noteParts.join('; ');
    var numExercises = isSenior ? 4 : (fitnessLevel === 'advanced' ? 6 : fitnessLevel === 'beginner' ? 4 : 5);
    var meta = {
      equipment: equipment[0] === 'none' ? ['משקל גוף'] : equipment.map(function (e) { return eqLabel(e); }),
      intensity: goalKey === 'strength' ? 'high' : 'medium',
      tags: audience ? [goalKey, audience] : [goalKey]
    };
    var dailyWorkouts = [];
    var pickOpts = { preferClips: preferClips, audience: audience };
    for (var d = 0; d < totalDays; d++) {
      var split = splitNameForDay(d, daysPerWeek);
      var muscles = musclesForDay(d, daysPerWeek, targetMuscles, injuredParts);
      var exercises = pickExercises(d, muscles, pool, numExercises, rx, notes, pickOpts);
      var warmUp = WARM_UPS[d % WARM_UPS.length];
      var coolDown = COOL_DOWNS[d % COOL_DOWNS.length];
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

  function catalogAsPool() {
    return catalogList().filter(function (e) {
      return e.file && e.muscles && e.muscles.length;
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
    return { total: list.length, withFile: list.filter(function (e) { return !!e.file; }).length, byMuscle: byMuscle, byEquipment: byEquipment, byTag: byTag };
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
        var blob = foldHe((e.he || '') + ' ' + (e.id || '') + ' ' + muscleLabel((e.muscles || [])[0] || ''));
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function matchCatalog(name) {
    if (!name) return null;
    var n = foldHe(name);
    if (!n) return null;
    var aliasId = NAME_ALIASES[n];
    if (aliasId && catalog[aliasId]) return catalog[aliasId];
    var keys = Object.keys(catalog);
    var i;
    for (i = 0; i < keys.length; i++) {
      var e = catalog[keys[i]];
      if (!e) continue;
      if (foldHe(e.he) === n || foldHe(keys[i]) === n || foldHe(e.id) === n) return e;
      if (HE_NAMES[keys[i]] && foldHe(HE_NAMES[keys[i]]) === n) return e;
    }
    var best = null;
    var bestLen = 0;
    for (i = 0; i < keys.length; i++) {
      var e2 = catalog[keys[i]];
      if (!e2) continue;
      var he = foldHe(e2.he);
      if (he.length >= 3 && (n.indexOf(he) !== -1 || he.indexOf(n) !== -1)) {
        if (he.length > bestLen) {
          best = e2;
          bestLen = he.length;
        }
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
    return !!(e && e.file);
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
    if (candidate.file) score += 1;
    if ((candidate.level || 'beginner') === ((current && current.level) || 'beginner')) score += 1;
    return score;
  }

  function substitutesFor(step, opts) {
    opts = opts || {};
    var current = findExercise(step);
    if (!current && step && (step.id || step.name) && catalog[step.id || step.name]) {
      current = catalog[step.id || step.name];
    }
    var muscles = (current && current.muscles) || opts.muscles || [];
    var excludeId = (current && current.id) || (step && (step.id || step.name)) || '';
    var have = opts.equipment;
    var list = catalogList().filter(function (e) {
      if (!e.file) return false;
      if (e.id === excludeId) return false;
      if (muscles.length && !e.muscles.some(function (m) { return muscles.indexOf(m) !== -1; })) return false;
      if (Array.isArray(have) && have.length && !userCanDo(e, have)) return false;
      return true;
    });
    list.sort(function (a, b) {
      return scoreSubstitute(b, current) - scoreSubstitute(a, current);
    });
    return list.slice(0, opts.limit || 5);
  }

  function applySwap(ex, entry) {
    if (!ex || !entry) return ex;
    return {
      name: entry.he,
      id: entry.id,
      sets: ex.sets != null ? ex.sets : null,
      reps: ex.reps != null ? ex.reps : null,
      duration_seconds: ex.duration_seconds != null ? ex.duration_seconds : null,
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
            reps: '8-12',
            duration_seconds: null,
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
    return who + 'הנה הסרטון ל«' + entry.he + '»:\n' + url + '\n\nפותחים בלי הרשמה. אם הנגן לא מופיע — הקובץ אצלך במכשיר, לא בענן.';
  }

  function daysSinceLast(client) {
    var logs = client && Array.isArray(client.logs) ? client.logs : [];
    if (!logs.length) return null;
    var last = logs.slice().sort(function (a, b) {
      return String(b.at || b.doneAt || '').localeCompare(String(a.at || a.doneAt || ''));
    })[0];
    var t = new Date(last.at || last.doneAt).getTime();
    if (isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
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
    var when = days == null
      ? 'עדיין לא ראיתי ביצוע מיובא'
      : (days === 0 ? 'ראיתי ביצוע היום' : ('עברו ' + days + ' ימים בלי ביצוע מיובא'));
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

  function draftAdd(id) {
    var entry = catalog[id];
    if (!entry) return null;
    var w = draftGet();
    var main = w.phases[1] || w.phases[0];
    if (!main.exercises) main.exercises = [];
    main.exercises.push({
      name: entry.he,
      id: entry.id,
      sets: 3,
      reps: '8-12',
      duration_seconds: null,
      rest_seconds: 45,
      notes: null
    });
    storeSet(KEYS.draft, w);
    return w;
  }

  function draftClear() {
    storeRemove(KEYS.draft);
  }

  function setCatalog(data) {
    catalog = data && typeof data === 'object' ? data : {};
    catalogReady = true;
    readyWaiters.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function loadCatalog() {
    if (catalogReady) return Promise.resolve(catalog);
    return fetch(assetUrl('js/catalog.json')).then(function (r) {
      return r.ok ? r.json() : {};
    }).then(function (data) {
      setCatalog(data);
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

  var api = {
    KEYS: KEYS,
    PHASE_LABELS: PHASE_LABELS,
    MUSCLE_LABELS: MUSCLE_LABELS,
    EQ_LABELS: EQ_LABELS,
    TAG_LABELS: TAG_LABELS,
    esc: esc,
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
    decodeHash: decodeHash,
    encodeResult: encodeResult,
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
    draftClear: draftClear,
    get catalog() { return catalog; }
  };

  root.TH = api;
  root.ThLink = {
    encodeLink: encodeLink,
    decodeHash: decodeHash,
    encodeResult: encodeResult,
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

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') loadCatalog();
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
