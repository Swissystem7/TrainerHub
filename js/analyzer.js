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
      phaseDurations: checkPhaseDurations(workout),
      beginnerEquipment: checkBeginnerEquipment(workout),
      primary: primarySet,
      secondary: secondarySet
    };
  }

  /* ── Session-structure rule: warm-up and cool-down minutes ─────────────────
     This is a deterministic check of a written rule, not a medical judgement.
     It reports "this session does not satisfy rule X"; it never reports that a
     session is safe, unsafe, approved, or medically suitable.

     Source of the numbers (RULE_SOURCE_SESSION_STRUCTURE below):
       ACSM's Guidelines for Exercise Testing and Prescription describes an
       exercise session as a warm-up of at least 5–10 min of light-to-moderate
       activity, a conditioning phase of at least 20–60 min, and a cool-down of
       at least 5–10 min.

     Honesty note about that citation: it was read on 2026-09-11 from secondhand
     summaries of the guidelines, not from the printed edition, so the citation is
     weak and is labelled as such. The source states 5–10 min as a FLOOR ("at
     least"), not as a window. The round-2 research file read it as a window
     (5–10 min per phase, 10–20 min combined). This module keeps the two readings
     apart on purpose:
       - below 5 minutes  -> the source's own floor is not met  (…-below-minimum)
       - above 10 minutes -> only above the top of the quoted range, which the
                             source does not forbid              (…-above-reference)
       - combined 10–20   -> arithmetic on the two per-phase figures, not a number
                             the source states on its own        (combined-outside-reference)
     The 60-minute scope comes from the round-2 backlog, not from the source. */

  var RULE_SOURCE_SESSION_STRUCTURE =
    "ACSM's Guidelines for Exercise Testing and Prescription — exercise session " +
    'structure: warm-up at least 5–10 min, conditioning 20–60 min, cool-down at ' +
    'least 5–10 min. Read 2026-09-11 from secondhand summaries, not from the ' +
    'printed edition — weak citation.';

  var RULE_NOTE_HE =
    'בדיקת מבנה מול כלל כתוב בלבד. אין כאן אישור מקצועי, אין ייעוץ רפואי, ' +
    'וההחלטה על התאמת האימון למתאמן נשארת אצל המאמן.';

  var PHASE_DURATION_RULE = {
    id: 'TH-PHASE-DURATION',
    minPhaseMinutes: 5,
    referenceMaxPhaseMinutes: 10,
    minCombinedMinutes: 10,
    referenceMaxCombinedMinutes: 20,
    appliesFromMinutes: 60,
    source: RULE_SOURCE_SESSION_STRUCTURE
  };

  function findPhase(workout, name) {
    var phases = (workout && workout.phases) || [];
    for (var i = 0; i < phases.length; i++) {
      if (phases[i] && phases[i].name === name) return phases[i];
    }
    return null;
  }

  function phaseMinutes(phase) {
    if (!phase) return 0;
    var n = Number(phase.duration_minutes);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function sessionMinutes(workout) {
    var declared = Number(workout && workout.duration_minutes);
    if (isFinite(declared) && declared > 0) return declared;
    var total = 0;
    ((workout && workout.phases) || []).forEach(function (ph) {
      total += phaseMinutes(ph);
    });
    return total;
  }

  /* Pure. Returns the measured minutes plus one finding per part of the rule
     the session does not satisfy. An empty findings list means "nothing in this
     rule was violated", never "this session is fine". */
  function checkPhaseDurations(workout) {
    var minutes = sessionMinutes(workout);
    var warm = findPhase(workout, 'Warm-up');
    var cool = findPhase(workout, 'Cool-down');
    var warmMinutes = phaseMinutes(warm);
    var coolMinutes = phaseMinutes(cool);
    var result = {
      rule: PHASE_DURATION_RULE.id,
      source: PHASE_DURATION_RULE.source,
      note: RULE_NOTE_HE,
      applies: minutes >= PHASE_DURATION_RULE.appliesFromMinutes,
      sessionMinutes: minutes,
      warmupMinutes: warmMinutes,
      cooldownMinutes: coolMinutes,
      combinedMinutes: warmMinutes + coolMinutes,
      findings: []
    };
    if (!result.applies) return result;

    function add(code, he) {
      result.findings.push({ code: code, rule: PHASE_DURATION_RULE.id, he: he });
    }

    if (!warm) {
      add('warmup-missing', 'אין שלב חימום בתוכנית. הכלל שנבדק כאן מבקש חימום של 5 דקות לפחות באימון של ' +
        PHASE_DURATION_RULE.appliesFromMinutes + ' דקות ומעלה.');
    } else if (warmMinutes < PHASE_DURATION_RULE.minPhaseMinutes) {
      add('warmup-below-minimum', 'החימום ' + warmMinutes + ' דקות. הכלל שנבדק כאן מבקש ' +
        PHASE_DURATION_RULE.minPhaseMinutes + ' דקות לפחות.');
    } else if (warmMinutes > PHASE_DURATION_RULE.referenceMaxPhaseMinutes) {
      add('warmup-above-reference', 'החימום ' + warmMinutes + ' דקות, מעל הטווח של ' +
        PHASE_DURATION_RULE.minPhaseMinutes + '–' + PHASE_DURATION_RULE.referenceMaxPhaseMinutes +
        ' דקות שמצוטט במקור הכלל. המקור לא אוסר על כך.');
    }

    if (!cool) {
      add('cooldown-missing', 'אין שלב שחרור בתוכנית. הכלל שנבדק כאן מבקש שחרור של 5 דקות לפחות באימון של ' +
        PHASE_DURATION_RULE.appliesFromMinutes + ' דקות ומעלה.');
    } else if (coolMinutes < PHASE_DURATION_RULE.minPhaseMinutes) {
      add('cooldown-below-minimum', 'השחרור ' + coolMinutes + ' דקות. הכלל שנבדק כאן מבקש ' +
        PHASE_DURATION_RULE.minPhaseMinutes + ' דקות לפחות.');
    } else if (coolMinutes > PHASE_DURATION_RULE.referenceMaxPhaseMinutes) {
      add('cooldown-above-reference', 'השחרור ' + coolMinutes + ' דקות, מעל הטווח של ' +
        PHASE_DURATION_RULE.minPhaseMinutes + '–' + PHASE_DURATION_RULE.referenceMaxPhaseMinutes +
        ' דקות שמצוטט במקור הכלל. המקור לא אוסר על כך.');
    }

    if (result.combinedMinutes < PHASE_DURATION_RULE.minCombinedMinutes ||
        result.combinedMinutes > PHASE_DURATION_RULE.referenceMaxCombinedMinutes) {
      add('combined-outside-reference', 'חימום ושחרור יחד ' + result.combinedMinutes + ' דקות, מחוץ לטווח ' +
        PHASE_DURATION_RULE.minCombinedMinutes + '–' + PHASE_DURATION_RULE.referenceMaxCombinedMinutes +
        ' דקות שנגזר מהמקור בחיבור שני השלבים.');
    }
    return result;
  }

  /* ── List rule: equipment that TrainerHub keeps out of a beginner / kids session ──
     Deterministic list membership, nothing else. A finding says "this exercise uses
     equipment that is not on the conservative list for a beginner or kids session".
     It never says the exercise is dangerous, unsuitable, or forbidden for a person,
     and it cites no guideline, because no guideline was read for it.

     The list is TrainerHub's own editorial choice, drawn from the repository's own
     equipment enumeration in js/infer.js (EQ_LABELS). It holds the three tags that
     put an external load or a fixed movement path on the trainee:
       bar     (מתח)    — hanging / rowing from a fixed bar
       barbell (מוט)    — free external load
       machine (מכונה)  — fixed movement path with a stack
     Checked against js/catalog.json on 2026-09-11: exactly one of the 78 entries
     carries any of them (bodyweight_row / מתח אוסטרלי, equipment ["bar"]); barbell
     and machine are declared in the enumeration but unused by the catalog.

     The round-2 research file proposed "ladder, bar, certain plyometric drills".
     ladder and stairs are NOT on this list: in this catalog ladder is
     "סולם רגליים" (agility-ladder footwork, level beginner) and stairs is
     "מדרגות" (step-up, level beginner) — ordinary kids' footwork drills, and
     flagging them would make the guardrail noise. Plyometrics are a movement
     pattern, not an equipment tag, so they are out of scope for this rule. */

  var BEGINNER_EQUIPMENT_RULE = {
    id: 'TH-BEGINNER-EQUIPMENT',
    blocked: ['bar', 'barbell', 'machine'],
    source: "TrainerHub's own conservative list, drawn from the equipment " +
      'enumeration in js/infer.js. No published guideline was read for it and ' +
      'none is claimed.'
  };

  function equipmentLabel(id) {
    return (Infer.EQ_LABELS && Infer.EQ_LABELS[id]) || id;
  }

  function audienceOf(workout, opts) {
    if (opts && opts.audience) return String(opts.audience);
    if (workout && workout.audience) return String(workout.audience);
    var tags = (workout && workout.tags) || [];
    return tags.indexOf('kids') !== -1 ? 'kids' : '';
  }

  function levelOf(workout, opts) {
    if (opts && opts.level) return String(opts.level);
    if (workout && workout.level) return String(workout.level);
    return '';
  }

  /* Pure. Applies only when the session is marked beginner or kids; otherwise it
     returns applies:false and an empty findings list, which means "this rule was
     not run", not "this session is fine". */
  function checkBeginnerEquipment(workout, opts) {
    var level = levelOf(workout, opts);
    var audience = audienceOf(workout, opts);
    var result = {
      rule: BEGINNER_EQUIPMENT_RULE.id,
      source: BEGINNER_EQUIPMENT_RULE.source,
      note: RULE_NOTE_HE,
      applies: level === 'beginner' || audience === 'kids',
      level: level,
      audience: audience,
      blocked: BEGINNER_EQUIPMENT_RULE.blocked.slice(),
      findings: []
    };
    if (!result.applies) return result;
    var exercises = flattenWorkout(workout);
    for (var i = 0; i < exercises.length; i++) {
      var a = analyzeExercise(exercises[i]);
      var hits = (a.equipment || []).filter(function (eq) {
        return BEGINNER_EQUIPMENT_RULE.blocked.indexOf(eq) !== -1;
      });
      if (!hits.length) continue;
      result.findings.push({
        code: 'equipment-off-list',
        rule: BEGINNER_EQUIPMENT_RULE.id,
        id: a.id,
        he: 'התרגיל «' + (a.he || '') + '» משתמש ב' + hits.map(equipmentLabel).join(', ') +
          ' — ציוד שאינו ברשימה השמרנית שלנו לאימון שסומן מתחילים או ילדים.',
        equipment: hits
      });
    }
    return result;
  }

  function claimsOutcome(text) {
    return FORBIDDEN_RX.test(String(text || ''));
  }

  var api = {
    STIMULUS: STIMULUS,
    PHASE_DURATION_RULE: PHASE_DURATION_RULE,
    BEGINNER_EQUIPMENT_RULE: BEGINNER_EQUIPMENT_RULE,
    RULE_NOTE_HE: RULE_NOTE_HE,
    analyzeExercise: analyzeExercise,
    analyzeSession: analyzeSession,
    checkPhaseDurations: checkPhaseDurations,
    checkBeginnerEquipment: checkBeginnerEquipment,
    flattenWorkout: flattenWorkout,
    claimsOutcome: claimsOutcome,
    muscleLabel: muscleLabel
  };

  root.THAnalyzer = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
