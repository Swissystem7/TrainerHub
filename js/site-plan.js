/**
 * TrainerHub — adapt a session to the training site ("סריקת שטח").
 * Classic script, no bundler. Namespace: window.THSitePlan.
 * Input: a SiteProfile (js/site-profile.js) + group size + season.
 * Output: a phases workout built for the site, plus Hebrew reasons and safety warnings.
 * Team-file risks still come from THBooklet.teamFile() (content/booklet/team-safety-file.json).
 */
(function (root) {
  'use strict';

  var Profile = root.THSiteProfile;
  var Booklet = root.THBooklet;
  if (typeof module === 'object' && module.exports) {
    Profile = require('./site-profile.js');
    Booklet = require('./booklet.js');
  }

  var SITE_DRILLS = {
    stairs: [
      { he: 'עליות מדרגות בריצה קלה', catalogId: null, seconds: 40, sets: 3, run: true, reason: 'בחרתי עליות מדרגות כי זוהו מדרגות' }
    ],
    bench: [
      { he: 'עליות על ספסל', catalogId: 'step_up', reps: 12, sets: 3, reason: 'בחרתי עליות על ספסל כי זוהה ספסל' },
      { he: 'שכיבות סמיכה לאחור על ספסל (דיפס)', catalogId: null, reps: 10, sets: 3, reason: 'בחרתי דיפס על ספסל כי זוהה ספסל' }
    ],
    wall: [
      { he: 'ישיבה על הקיר', catalogId: null, seconds: 30, sets: 3, reason: 'בחרתי ישיבה על הקיר כי זוהה קיר' },
      { he: 'שכיבות סמיכה בשעינה על קיר', catalogId: null, reps: 15, sets: 2, reason: 'בחרתי שכיבות סמיכה על קיר כי זוהה קיר' }
    ],
    slope: [
      { he: 'ריצות עלייה בשיפוע', catalogId: null, seconds: 20, sets: 4, run: true, reason: 'בחרתי ריצות עלייה כי זוהה שיפוע' }
    ]
  };

  var CAPACITY = { narrow: 8, medium: 16, wide: 40 };
  var MIN_RELAY_GROUP = 4;

  var HAZARD_LINES = {
    cars: 'זוהו מכוניות: לסמן גבול אימון הרחק מהכביש, בלי ריצות לכיוון הכביש ובלי משחקי רדיפה ליד החניה.',
    uneven: 'משטח לא אחיד: בלי ספרינטים ושינויי כיוון חדים, לבדוק את השטח לפני האימון.',
    glass: 'זכוכיות או פסולת: לנקות או לגדר את האזור לפני שמתחילים, בלי תרגילים על הרצפה שם.',
    dark: 'תאורה חלשה: לעבוד באזור המואר בלבד ולהקטין את המרחקים.',
    crowd: 'עוברים ושבים: להשאיר מעבר פנוי ולא לחסום את השביל.',
    water: 'מים או בור: לסמן את המקום ולהרחיק ממנו את התחנות.',
    heat: 'חשיפה לשמש: הפסקות שתייה תכופות, לעבור לצל במנוחות.'
  };

  // Generic winter tips (not tied to any external course booklet).
  var WINTER = {
    'תנאי שטח רטובים וחלקלקים': 'יש לשים לב לתנאי הקרקע, במיוחד בגשם או בשלג, ולהימנע מאימון במשטחים חלקים שעלולים להוביל להחלקות ונפילות.',
    'חימום ממושך': 'בשל הקור, יש להאריך את שלב החימום לפני תחילת האימון. השרירים והמפרקים נוטים להיות נוקשים יותר בטמפרטורות נמוכות.'
  };

  var TAG_GAME = {
    he: 'תופסת',
    description: 'משחק תופסת קבוצתי: הנתפס מבצע משימה קצרה וחוזר למשחק.'
  };

  // Warm-up bank. Stairs / jump-rope drills only when the site has that gear.
  var WARMUP_BANK = [
    { he: 'ריצה לפנים תוך סיבובי ידיים לפנים.', gear: [] },
    { he: 'ריצה לאחור תוך סיבובי ידיים לאחור.', gear: [] },
    { he: 'ריצה בהרמת בירכיים.', gear: [] },
    { he: 'ריצה צידית.', gear: [] },
    { he: 'ריצה קלה במדרגות', gear: ['stairs'] },
    { he: 'ריצה עם דלגית', gear: ['rope'] }
  ];

  var STRETCH_BANK = [
    { he: 'תאומים – שריר שוק אחוריים', equipment: ['none'] },
    { he: 'מקרבי ירך ישיבת כף אל כף (מעוין)', equipment: ['none'] },
    { he: 'מקרבי ירך בשכיבת פרקדן (על הגב)', equipment: ['none'] },
    { he: 'שכיבת פרקדן ומשיכת צוואר לחזה.', equipment: ['none'] },
    { he: 'מתיחת חזה בפתח', equipment: ['none'] },
    { he: 'מתיחת ירך על מדרגה', equipment: ['step'] },
    { he: 'מתיחת תאומים על מדרגה', equipment: ['step'] },
    { he: 'תלייה למתיחת גב', equipment: ['pullup_bar'] },
    { he: 'מתיחת כתף בתלייה', equipment: ['pullup_bar'] },
    { he: 'מתיחה עם מגבת', equipment: ['towel'] }
  ];

  var STRETCH_GEAR = { step: ['stairs', 'bench'], pullup_bar: ['playground'] };

  var MAIN_BANK = {
    tabata: [
      'ברפי', 'סקווט', 'שכיבות סמיכה', 'ברכיים לחזה', 'פלאנק', 'לאנג׳', 'מאונטיין קליימבר', 'ג׳אמפינג ג׳ק'
    ],
    'igo-ugo': [
      'סקווט בזוגות', 'שכיבות סמיכה בזוגות', 'פלאנק בזוגות', 'לאנג׳ בזוגות',
      'ברפי בזוגות', 'מאונטיין קליימבר בזוגות', 'כפיפת מרפקים בזוגות', 'עליות בטן בזוגות'
    ],
    combined: [
      'תרגיל "מטפס"', 'סקווט ללא אמצעי', 'ברפי', 'שכיבות סמיכה',
      'לאנג׳ הליכה', 'פלאנק', 'ברכיים לחזה', 'ג׳אמפינג ג׳ק'
    ],
    'opening-1': [
      "חלק א' – מרוץ שליחים", 'סקוטים', 'שכיבות שמיכה', 'עליות בטן',
      'לאנג׳ים', 'פלאנק', 'ברפי', 'סקווט קפיצה'
    ]
  };

  function rule(sectionHe) {
    return WINTER[sectionHe] || null;
  }

  function stretchFits(name, features) {
    var d = STRETCH_BANK.filter(function (x) { return x.he === name; })[0];
    return !d || (d.equipment || []).every(function (e) {
      return e === 'none' || (STRETCH_GEAR[e] || []).some(function (f) { return features.indexOf(f) !== -1; });
    });
  }

  function floorNote(d, slippery, uneven) {
    if (slippery) return 'משטח חלק: בקצב הליכה, בלי ריצה';
    if (uneven && d.run) return 'משטח לא אחיד: בקצב הליכה, בלי ספרינט';
    return null;
  }

  function siteExercise(d, note) {
    return {
      name: d.he,
      id: d.catalogId,
      sets: d.sets,
      reps: d.reps != null ? d.reps : null,
      duration_seconds: d.reps != null ? null : d.seconds,
      rest_seconds: 45,
      notes: note
    };
  }

  function exerciseSeconds(x) {
    var sets = Math.max(1, Number(x.sets) || 1);
    var work = x.duration_seconds != null ? (Number(x.duration_seconds) || 0) : (Number(x.reps) || 0) * 3;
    var rest = Number(x.rest_seconds) || 0;
    return sets * work + (sets - 1) * rest;
  }

  function addExercise(phase, exercise, atStart) {
    if (atStart) phase.exercises.unshift(exercise); else phase.exercises.push(exercise);
    phase.added_seconds = (phase.added_seconds || 0) + exerciseSeconds(exercise);
  }

  function settleMinutes(workout) {
    workout.phases.forEach(function (ph) {
      if (ph.added_seconds) ph.duration_minutes = (Number(ph.duration_minutes) || 0) + Math.round(ph.added_seconds / 60);
      delete ph.added_seconds;
    });
    workout.duration_minutes = workout.phases.reduce(function (a, ph) { return a + (Number(ph.duration_minutes) || 0); }, 0);
  }

  function warmupMinutes(opts) {
    return opts && opts.season === 'winter' ? 10 : 5;
  }

  function hostableWarmup(d, gear) {
    return (d.gear || []).every(function (g) { return gear.indexOf(g) !== -1; });
  }

  function warmupPhase(opts) {
    opts = opts || {};
    var minutes = warmupMinutes(opts);
    var gear = opts.gear || [];
    var bank = WARMUP_BANK.filter(function (d) { return hostableWarmup(d, gear); });
    if (!bank.length) bank = WARMUP_BANK.filter(function (d) { return !(d.gear || []).length; });
    var chosen = [];
    var i = 0;
    while (chosen.length < minutes) {
      chosen.push(bank[i % bank.length]);
      i += 1;
    }
    var each = Math.round((minutes * 60) / chosen.length);
    return {
      name: 'Warm-up',
      duration_minutes: minutes,
      exercises: chosen.map(function (d) {
        return { name: d.he, id: null, sets: 1, reps: null, duration_seconds: each, rest_seconds: null, notes: null };
      })
    };
  }

  function cooldownPhase(features) {
    var bank = STRETCH_BANK.filter(function (d) { return stretchFits(d.he, features || []); });
    var pick = bank.slice(0, Math.max(3, Math.min(8, bank.length)));
    return {
      name: 'Cool-down',
      duration_minutes: 10,
      exercises: pick.map(function (d) {
        return { name: d.he, id: null, sets: 1, reps: null, duration_seconds: 30, rest_seconds: null, notes: null };
      })
    };
  }

  function baseWorkout(id, opts) {
    opts = opts || {};
    var names = MAIN_BANK[id] || MAIN_BANK.combined;
    var limited = id !== 'opening-1';
    var main;
    if (id === 'tabata') {
      main = names.map(function (he) {
        return { name: he, id: null, sets: 4, reps: null, duration_seconds: 20, rest_seconds: 10, notes: 'טבטה: 20 שנ׳ עבודה / 10 שנ׳ מנוחה' };
      });
    } else if (id === 'igo-ugo') {
      main = names.map(function (he) {
        return { name: he, id: null, sets: 1, reps: null, duration_seconds: 40, rest_seconds: 20, notes: 'IGO-UGO בזוגות, מנוחה 3 דק׳ בין סבב לסבב' };
      });
    } else if (id === 'opening-1') {
      main = names.map(function (he, i) {
        return {
          name: he,
          id: null,
          sets: i === 0 ? 1 : 2,
          reps: null,
          duration_seconds: i === 0 ? 1200 : 40,
          rest_seconds: i === 0 ? null : 20,
          notes: null
        };
      });
    } else {
      main = names.map(function (he) {
        return { name: he, id: null, sets: 1, reps: null, duration_seconds: 40, rest_seconds: 20, notes: null };
      });
    }
    var tags = limited ? ['limited-space', id] : ['opening', id];
    var title = limited ? ('אימון ' + id) : 'אימון פתיחה';
    var mainMinutes = id === 'opening-1' ? 45 : id === 'tabata' ? 22 : 25;
    return {
      title: title,
      duration_minutes: 0,
      participants: 1,
      equipment: ['none'],
      intensity: 'medium',
      tags: tags,
      source: 'site-plan',
      phases: [
        warmupPhase(opts),
        { name: 'Main', duration_minutes: mainMinutes, exercises: main },
        cooldownPhase(opts.gear || [])
      ]
    };
  }

  function baseChoice(p, group, unsafeFloor, cars, dark) {
    if (p.width === 'narrow') {
      if (group >= 2) return { kind: 'method', id: 'igo-ugo', reason: 'בחרתי שיטת IGO-UGO בזוגות כי השטח צר: חצי עובד וחצי נח באותו מקום' };
      return { kind: 'method', id: 'tabata', reason: 'בחרתי טבטה כי השטח צר ואפשר לעבוד במקום' };
    }
    if (p.width === 'medium') return { kind: 'method', id: 'combined', reason: 'בחרתי אימון משולב (אירובי + כוח) כי השטח בינוני' };
    if (unsafeFloor || cars || dark || group < MIN_RELAY_GROUP) {
      var why = (unsafeFloor || cars || dark) ? noRunWhy(unsafeFloor, cars) : 'אין מספיק מתאמנים לשתי קבוצות שליחים';
      return { kind: 'method', id: 'combined', reason: 'בחרתי אימון משולב (אירובי + כוח) ולא את אימון הפתיחה עם מרוץ השליחים כי ' + why };
    }
    return { kind: 'session', id: 'opening-1', reason: 'בחרתי אימון פתיחה כי השטח רחב ומאפשר ריצות' };
  }

  function noRunWhy(unsafeFloor, cars) {
    return unsafeFloor ? 'המשטח לא בטוח לריצה' : cars ? 'יש מכוניות ליד השטח' : 'התאורה חלשה';
  }

  function layoutFor(p, group) {
    var cap = CAPACITY[p.width];
    if (group <= cap) return { layout: 'together', line: null };
    if (p.width === 'narrow') {
      return { layout: 'waves', line: group + ' מתאמנים בשטח צר: לעבוד בגלים של עד ' + cap + ', השאר בתרגיל במקום' };
    }
    return { layout: 'stations', line: group + ' מתאמנים: לחלק לתחנות של עד ' + Math.ceil(cap / 2) + ' בכל תחנה' };
  }

  function build(profile, opts) {
    opts = opts || {};
    var p = Profile.normalize(profile, profile && profile.source);
    var group = Math.max(1, Math.round(Number(opts.group) || 1));
    var winter = opts.season === 'winter';
    var reasons = [];
    var warnings = [];
    var slippery = p.hazards.indexOf('slippery') !== -1;
    var uneven = p.hazards.indexOf('uneven') !== -1;
    var unsafeFloor = slippery || uneven;
    var cars = p.hazards.indexOf('cars') !== -1;
    var dark = p.hazards.indexOf('dark') !== -1;

    var base = baseChoice(p, group, unsafeFloor, cars, dark);
    var bopts = { season: winter ? 'winter' : 'summer', activity: 'long', gear: p.features };
    var workout = baseWorkout(base.id, bopts);
    reasons.push(base.reason);

    var main = workout.phases.filter(function (ph) { return ph.name === 'Main'; })[0];
    Object.keys(SITE_DRILLS).forEach(function (feature) {
      if (p.features.indexOf(feature) === -1) return;
      SITE_DRILLS[feature].forEach(function (d) {
        addExercise(main, siteExercise(d, floorNote(d, slippery, uneven)));
        reasons.push(d.reason);
      });
    });
    if (p.features.some(function (f) { return SITE_DRILLS[f]; })) workout.tags.push('site');

    var warm = workout.phases[0];
    if (slippery) {
      warm.exercises.forEach(function (x) {
        var note = floorNote(x, true, false);
        x.notes = x.notes ? x.notes + ' · ' + note : note;
      });
    }
    if (p.width === 'wide' && group >= 6 && !unsafeFloor && !cars && !dark) {
      addExercise(warm, {
        name: TAG_GAME.he,
        id: null,
        sets: 1,
        reps: null,
        duration_seconds: 300,
        rest_seconds: null,
        notes: TAG_GAME.description
      }, true);
      reasons.push('פתחתי ב' + TAG_GAME.he + ' כי השטח רחב והקבוצה גדולה (' + group + ')');
    } else if (group >= 6 && p.width !== 'wide') {
      reasons.push('לא שילבתי משחקי תופסת או שליחים כי השטח לא רחב מספיק');
    } else if (group >= 6) {
      reasons.push('לא שילבתי משחקי תופסת או שליחים כי ' + noRunWhy(unsafeFloor, cars));
    }

    var cool = workout.phases[workout.phases.length - 1];
    cool.exercises = cool.exercises.filter(function (x) { return stretchFits(x.name, p.features); });

    settleMinutes(workout);

    var lay = layoutFor(p, group);
    if (lay.line) warnings.push(lay.line);

    p.hazards.forEach(function (h) {
      if (h === 'slippery') {
        warnings.push('משטח חלק: ' + (rule('תנאי שטח רטובים וחלקלקים') || 'להימנע מריצות ושינויי כיוון.'));
      } else if (h !== 'heat' || !p.shade) {
        warnings.push(HAZARD_LINES[h]);
      }
    });
    if (winter) {
      var longer = rule('חימום ממושך');
      if (longer) warnings.push('חורף: ' + longer);
    }

    return {
      workout: workout,
      method: base.id,
      layout: lay.layout,
      profile: p,
      reasons: reasons,
      warnings: warnings
    };
  }

  var RISK_ROWS = {
    cars: 'דריסה',
    uneven: 'פציעות במהלך ספורט',
    slippery: 'פציעות במהלך ספורט',
    glass: 'פציעות במהלך ספורט',
    dark: 'אובדן חניך',
    crowd: 'פגיעה מאימון עם חניכים נוספים',
    water: 'נפילה ממצוק ונפילה לבורות',
    heat: 'התייבשות ומכת חום'
  };
  var SEEN_BUMP = 2;

  function riskLevel(score) {
    if (score >= 50) return { id: 'high', he: 'גבוה' };
    if (score >= 25) return { id: 'medium', he: 'בינוני' };
    return { id: 'low', he: 'נמוך' };
  }

  function risks(profile, opts) {
    opts = opts || {};
    var team = Booklet.teamFile && Booklet.teamFile();
    if (!team || !team.riskMatrix) return [];
    var p = Profile.normalize(profile, profile && profile.source);
    var rows = team.riskMatrix.rows;
    function rowFor(key) { return rows.filter(function (r) { return r.hazard.indexOf(key) !== -1; })[0] || null; }
    var byHazard = {};
    var order = [];
    function add(key, cause, seen, siteLine) {
      var r = rowFor(key);
      if (!r) return;
      var x = byHazard[r.hazard];
      if (!x) {
        x = byHazard[r.hazard] = { hazard: r.hazard, causes: [], seen: false, severity: r.severity, baseLikelihood: r.likelihood, mitigations: r.mitigations.slice(), siteLines: [] };
        order.push(x);
      }
      if (cause && x.causes.indexOf(cause) === -1) x.causes.push(cause);
      if (seen) x.seen = true;
      if (siteLine && x.siteLines.indexOf(siteLine) === -1) x.siteLines.push(siteLine);
    }
    var labels = {};
    Profile.HAZARDS.forEach(function (h) { labels[h.id] = h.he; });
    p.hazards.forEach(function (id) { if (RISK_ROWS[id]) add(RISK_ROWS[id], labels[id], true, HAZARD_LINES[id] || null); });
    add('פציעות במהלך ספורט', 'כל אימון בשטח', false, null);
    if (opts.season !== 'winter') add('התייבשות ומכת חום', 'עונת קיץ', false, null);
    return order.map(function (x) {
      var likelihood = Math.min(10, x.baseLikelihood + (x.seen ? SEEN_BUMP : 0));
      var score = Math.round(likelihood * x.severity);
      return { hazard: x.hazard, causes: x.causes, likelihood: likelihood, severity: x.severity, score: score, level: riskLevel(score), mitigations: x.mitigations, siteLines: x.siteLines };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  var api = {
    SITE_DRILLS: SITE_DRILLS,
    CAPACITY: CAPACITY,
    STRETCH_BANK: STRETCH_BANK,
    TAG_GAME: TAG_GAME,
    build: build,
    risks: risks,
    riskLevel: riskLevel
  };

  root.THSitePlan = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
