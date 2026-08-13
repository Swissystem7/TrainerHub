/**
 * Workout analyzer — one exercise or a whole session.
 * Stimulus is phrased as training stimulus, never as a promised outcome.
 * Classic script. Namespace: window.THAnalyzer
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
  }

  var STIMULUS = {
    endurance: {
      key: 'endurance',
      he: 'סבולת שריר',
      detail: 'גירוי לסבולת שריר — חזרות גבוהות או זמן תחת עומס, ומנוחות קצרות.'
    },
    hypertrophy: {
      key: 'hypertrophy',
      he: 'היפרטרופיה',
      detail: 'גירוי להיפרטרופיה — טווח חזרות בינוני ומנוחה בינונית.'
    },
    strength: {
      key: 'strength',
      he: 'כוח',
      detail: 'גירוי לכוח — מעט חזרות כבדות ומנוחות ארוכות.'
    },
    core: {
      key: 'core',
      he: 'ליבה',
      detail: 'גירוי לייצוב ליבה — החזקות וזמן תחת עומס על שרירי הגוף המרכזיים.'
    }
  };

  var FORBIDDEN_RX = /תרזה|תרדי|תרד במשקל|תרז[הי]|קילוגרם|ק״ג|ק"ג|מובטח|תוצאות מובטחות|קוביות בטן מובטח|תעלה במסה/i;

  function muscleLabel(id) {
    return (Infer.MUSCLE_LABELS && Infer.MUSCLE_LABELS[id]) || id;
  }

  function resolveEntry(input) {
    if (!input) return { he: '', muscles: [], equipment: ['none'], level: 'beginner' };
    if (typeof input === 'string') {
      var fromCat = root.TH && typeof root.TH.matchCatalog === 'function'
        ? root.TH.matchCatalog(input)
        : null;
      if (fromCat) return fromCat;
      return { he: input, name: input, muscles: [], equipment: ['none'] };
    }
    var name = input.he || input.name || '';
    var entry = input;
    if (root.TH && typeof root.TH.findExercise === 'function') {
      var hit = root.TH.findExercise(input) || (input.id && root.TH.catalog && root.TH.catalog[input.id]);
      if (hit) entry = Object.assign({}, hit, input);
    } else if (input.id && root.TH && root.TH.catalog && root.TH.catalog[input.id]) {
      entry = Object.assign({}, root.TH.catalog[input.id], input);
    }
    if (!entry.he) entry.he = name;
    return entry;
  }

  function analyzeExercise(input) {
    var entry = resolveEntry(input);
    var inferred = Infer.inferFromName(entry.he || entry.name || '', {
      folder: entry.folder || '',
      hint: (entry.muscles || []).join(' ')
    });
    var muscles = (entry.muscles && entry.muscles.length) ? entry.muscles.slice() : inferred.muscles.slice();
    var primary = muscles[0] || inferred.muscles[0] || 'core';
    var secondary = Infer.uniq((inferred.secondary || []).concat(muscles.slice(1)));
    secondary = secondary.filter(function (m) { return m !== primary; });
    var pattern = inferred.pattern;
    var load = inferred.load;
    if (entry.duration_seconds && !entry.reps) load = 'time';
    if (entry.reps && !entry.duration_seconds) load = 'reps';
    return {
      id: entry.id || null,
      he: entry.he || entry.name || '',
      primary: primary,
      secondary: secondary,
      muscles: muscles,
      pattern: pattern,
      load: load,
      difficulty: entry.level || inferred.level,
      equipment: (entry.equipment && entry.equipment.length) ? entry.equipment : inferred.equipment
    };
  }

  function flattenWorkout(workout) {
    if (!workout) return [];
    if (Array.isArray(workout)) return workout;
    if (Array.isArray(workout.exercises) && !workout.phases) return workout.exercises;
    var out = [];
    (workout.phases || []).forEach(function (ph) {
      (ph.exercises || []).forEach(function (ex) {
        if (!ex) return;
        out.push(Object.assign({ _phase: ph.name }, ex));
      });
    });
    return out;
  }

  function parseRepMid(reps) {
    if (reps == null) return null;
    if (typeof reps === 'number' && isFinite(reps)) return reps;
    var m = String(reps).match(/(\d+)\s*[-–]\s*(\d+)/);
    if (m) return (Number(m[1]) + Number(m[2])) / 2;
    var n = parseInt(reps, 10);
    return isNaN(n) ? null : n;
  }

  function estimateDuration(workout, exercises) {
    if (workout && workout.duration_minutes) return Number(workout.duration_minutes) || 0;
    var seconds = 0;
    exercises.forEach(function (ex) {
      var sets = Number(ex.sets) || 1;
      var work = Number(ex.duration_seconds) || 0;
      if (!work) {
        var reps = parseRepMid(ex.reps);
        work = reps ? reps * 3 : 30;
      }
      var rest = Number(ex.rest_seconds || ex.restSeconds) || 45;
      seconds += sets * work + Math.max(0, sets - 1) * rest;
    });
    return Math.max(1, Math.round(seconds / 60));
  }

  function estimateIntensity(workout, analyses) {
    if (workout && workout.intensity) return workout.intensity;
    var plyo = 0;
    var hard = 0;
    analyses.forEach(function (a) {
      if (a.pattern === 'plyo') plyo++;
      if (a.difficulty === 'advanced') hard++;
      if (a.difficulty === 'intermediate') hard += 0.4;
    });
    if (plyo >= 2 || hard >= 3) return 'high';
    if (analyses.every(function (a) { return a.difficulty === 'beginner'; }) && plyo === 0) return 'low';
    return 'medium';
  }

  function estimateStimulus(workout, analyses, exercises) {
    var coreShare = 0;
    var timeShare = 0;
    analyses.forEach(function (a) {
      if (a.primary === 'core' || a.pattern === 'core') coreShare++;
      if (a.load === 'time') timeShare++;
    });
    var n = analyses.length || 1;
    var avgReps = 0;
    var avgRest = 0;
    var counted = 0;
    exercises.forEach(function (ex) {
      var r = parseRepMid(ex.reps);
      if (r != null) {
        avgReps += r;
        counted++;
      }
      if (ex.rest_seconds != null || ex.restSeconds != null) {
        avgRest += Number(ex.rest_seconds || ex.restSeconds) || 0;
      }
    });
    if (counted) avgReps = avgReps / counted;
    if (exercises.length) avgRest = avgRest / exercises.length;

    var goal = workout && (workout.goal || (workout.tags && workout.tags[0]));
    if (goal === 'strength') return STIMULUS.strength;
    if (goal === 'hypertrophy' || goal === 'muscle_gain') return STIMULUS.hypertrophy;
    if (goal === 'endurance') return STIMULUS.endurance;
    if (goal === 'core') return STIMULUS.core;

    if (coreShare / n >= 0.6 && timeShare / n >= 0.4) return STIMULUS.core;
    if (avgReps && avgReps <= 6 && avgRest >= 90) return STIMULUS.strength;
    if (avgReps && avgReps >= 12) return STIMULUS.endurance;
    if (timeShare / n >= 0.5) return STIMULUS.endurance;
    if (avgReps && avgReps >= 8 && avgReps <= 12) return STIMULUS.hypertrophy;
    if (coreShare / n >= 0.7) return STIMULUS.core;
    return STIMULUS.hypertrophy;
  }

  function qualityFlags(workout, analyses, volumePct, push, pull) {
    var flags = [];
    var corePct = volumePct.core || 0;
    if (corePct >= 70 && !volumePct.back) {
      flags.push({
        key: 'core-heavy-no-back',
        he: 'האימון הזה ' + corePct + '% ליבה, אין עבודת גב'
      });
    } else if (corePct >= 80) {
      flags.push({
        key: 'core-heavy',
        he: 'האימון הזה ' + corePct + '% ליבה'
      });
    }
    if (pull === 0 && analyses.length) {
      flags.push({ key: 'no-pull', he: 'אין תרגילי משיכה' });
    }
    if (push === 0 && pull > 0) {
      flags.push({ key: 'no-push', he: 'אין תרגילי דחיפה' });
    }
    var phases = (workout && workout.phases) || [];
    var warm = null;
    for (var i = 0; i < phases.length; i++) {
      if (phases[i].name === 'Warm-up') warm = phases[i];
    }
    if (!warm || !(warm.exercises && warm.exercises.length)) {
      flags.push({ key: 'no-warmup', he: 'חסר חימום' });
    }
    var used = {};
    analyses.forEach(function (a) { used[a.primary] = true; });
    if (!used.back && !used.legs && used.chest) {
      flags.push({ key: 'no-posterior', he: 'אין עבודת שרשרת אחורית' });
    }
    return flags;
  }

  function analyzeSession(workout) {
    var exercises = flattenWorkout(workout);
    var analyses = exercises.map(analyzeExercise);
    var volume = {};
    analyses.forEach(function (a) {
      var m = a.primary || 'core';
      volume[m] = (volume[m] || 0) + 1;
    });
    var total = analyses.length || 1;
    var volumePct = {};
    Object.keys(volume).forEach(function (k) {
      volumePct[k] = Math.round((100 * volume[k]) / total);
    });
    var push = 0;
    var pull = 0;
    analyses.forEach(function (a) {
      if (a.pattern === 'push') push++;
      if (a.pattern === 'pull') pull++;
    });
    var durationMinutes = estimateDuration(workout, exercises);
    var intensity = estimateIntensity(workout, analyses);
    var stimulus = estimateStimulus(workout, analyses, exercises);
    var flags = qualityFlags(workout, analyses, volumePct, push, pull);

    var primarySet = Infer.uniq(analyses.map(function (a) { return a.primary; }));
    var secondarySet = Infer.uniq(analyses.reduce(function (acc, a) {
      return acc.concat(a.secondary || []);
    }, []).filter(function (m) { return primarySet.indexOf(m) === -1; }));

    return {
      exercises: analyses,
      volume: volumePct,
      pushPull: { push: push, pull: pull },
      durationMinutes: durationMinutes,
      intensity: intensity,
      stimulus: stimulus,
      flags: flags,
      primary: primarySet,
      secondary: secondarySet
    };
  }

  function claimsOutcome(text) {
    return FORBIDDEN_RX.test(String(text || ''));
  }

  var api = {
    STIMULUS: STIMULUS,
    analyzeExercise: analyzeExercise,
    analyzeSession: analyzeSession,
    flattenWorkout: flattenWorkout,
    claimsOutcome: claimsOutcome,
    muscleLabel: muscleLabel
  };

  root.THAnalyzer = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
