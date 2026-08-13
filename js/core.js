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
    user: 'trainerhub_user'
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
    localStorage.setItem(key, JSON.stringify(val));
  }

  function storeRemove(key) {
    localStorage.removeItem(key);
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

  function pickExercises(dayIndex, muscles, pool, count, rx, notes) {
    var used = {};
    var exercises = [];
    var slot = 0;
    var guard = 0;
    while (exercises.length < count && guard < 48) {
      var muscle = muscles[slot % muscles.length];
      var candidates = pool.filter(function (ex) {
        return !used[ex.id] && ex.muscles.indexOf(muscle) !== -1;
      });
      if (candidates.length) {
        var pick = candidates[(dayIndex + slot) % candidates.length];
        used[pick.id] = true;
        exercises.push({ name: pick.id, sets: rx.sets, reps: rx.reps, restSeconds: rx.rest, rest_seconds: rx.rest, notes: notes });
      }
      slot++;
      guard++;
      if (slot > muscles.length && candidates.length === 0 && exercises.length === 0) {
        var fallback = pool.filter(function (ex) { return !used[ex.id]; });
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
    var pool = PROGRAM_POOL.filter(function (ex) {
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
      equipment: equipment[0] === 'none' ? ['משקל גוף'] : equipment,
      intensity: goalKey === 'strength' ? 'high' : 'medium',
      tags: [goalKey]
    };
    var dailyWorkouts = [];
    for (var d = 0; d < totalDays; d++) {
      var split = splitNameForDay(d, daysPerWeek);
      var muscles = musclesForDay(d, daysPerWeek, targetMuscles, injuredParts);
      var exercises = pickExercises(d, muscles, pool, numExercises, rx, notes);
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
    waShareUrl: waShareUrl
  };
  root.esc = esc;

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') loadCatalog();
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
