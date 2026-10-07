/**
 * TrainerHub — adapt a session to the training site ("סריקת שטח").
 * Classic script, no bundler. Namespace: window.THSitePlan.
 * Input: a SiteProfile (js/site-profile.js) + group size + season.
 * Output: a phases workout built from the Acharai booklet (js/booklet.js),
 * plus one Hebrew line per choice ("בחרתי ... כי ...") and safety warnings.
 * The booklet data must be loaded (THBooklet.load() / setData()) first.
 */
(function (root) {
  'use strict';

  var Profile = root.THSiteProfile;
  var Booklet = root.THBooklet;
  if (typeof module === 'object' && module.exports) {
    Profile = require('./site-profile.js');
    Booklet = require('./booklet.js');
  }

  // Drills the site itself makes possible. catalogId only where the video catalog has one.
  var SITE_DRILLS = {
    stairs: [
      { he: 'עליות מדרגות בריצה קלה', catalogId: null, seconds: 40, sets: 3, reason: 'בחרתי עליות מדרגות כי זוהו מדרגות' }
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
      { he: 'ריצות עלייה בשיפוע', catalogId: null, seconds: 20, sets: 4, reason: 'בחרתי ריצות עלייה כי זוהה שיפוע' }
    ]
  };

  // How many trainees each width holds working together before splitting into waves/stations.
  var CAPACITY = { narrow: 8, medium: 16, wide: 40 };

  var HAZARD_LINES = {
    cars: 'זוהו מכוניות: לסמן גבול אימון הרחק מהכביש, בלי ריצות לכיוון הכביש ובלי משחקי רדיפה ליד החניה.',
    uneven: 'משטח לא אחיד: בלי ספרינטים ושינויי כיוון חדים, לבדוק את השטח לפני האימון.',
    glass: 'זכוכיות או פסולת: לנקות או לגדר את האזור לפני שמתחילים, בלי תרגילים על הרצפה שם.',
    dark: 'תאורה חלשה: לעבוד באזור המואר בלבד ולהקטין את המרחקים.',
    crowd: 'עוברים ושבים: להשאיר מעבר פנוי ולא לחסום את השביל.',
    water: 'מים או בור: לסמן את המקום ולהרחיק ממנו את התחנות.',
    heat: 'חשיפה לשמש: הפסקות שתייה תכופות, לעבור לצל במנוחות.'
  };

  function rule(sectionHe) {
    var w = Booklet.data && Booklet.data.safety && Booklet.data.safety.winter;
    if (!w) return null;
    for (var i = 0; i < w.sections.length; i++) if (w.sections[i].he === sectionHe) return w.sections[i].points[0];
    return null;
  }

  function siteExercise(d, slippery) {
    return {
      name: d.he,
      id: d.catalogId,
      sets: d.sets,
      reps: d.reps != null ? d.reps : null,
      duration_seconds: d.reps != null ? null : d.seconds,
      rest_seconds: 45,
      notes: slippery ? 'משטח חלק: בקצב הליכה, בלי ריצה' : null
    };
  }

  /** Which base workout fits the width. Narrow space → a limited-space method from the booklet. */
  function baseChoice(p, group) {
    if (p.width === 'narrow') {
      if (group >= 2) return { kind: 'method', id: 'igo-ugo', reason: 'בחרתי שיטת IGO-UGO בזוגות כי השטח צר: חצי עובד וחצי נח באותו מקום' };
      return { kind: 'method', id: 'tabata', reason: 'בחרתי טבטה כי השטח צר ואפשר לעבוד במקום' };
    }
    if (p.width === 'medium') return { kind: 'method', id: 'combined', reason: 'בחרתי אימון משולב (אירובי + כוח) כי השטח בינוני' };
    return { kind: 'session', id: 'opening-1', reason: 'בחרתי אימון פתיחה מהחוברת כי השטח רחב ומאפשר ריצות' };
  }

  function layoutFor(p, group) {
    var cap = CAPACITY[p.width];
    if (group <= cap) return { layout: 'together', line: null };
    if (p.width === 'narrow') {
      return { layout: 'waves', line: group + ' מתאמנים בשטח צר: לעבוד בגלים של עד ' + cap + ', השאר בתרגיל במקום' };
    }
    return { layout: 'stations', line: group + ' מתאמנים: לחלק לתחנות של עד ' + Math.ceil(cap / 2) + ' בכל תחנה' };
  }

  /**
   * profile: SiteProfile (any shape, normalized here).
   * opts: { group: number of trainees, season: 'summer'|'winter' }.
   * → { workout, method, layout, reasons[], warnings[] }
   */
  function build(profile, opts) {
    opts = opts || {};
    var p = Profile.normalize(profile, profile && profile.source);
    var group = Math.max(1, Math.round(Number(opts.group) || 1));
    var winter = opts.season === 'winter';
    var reasons = [];
    var warnings = [];
    var slippery = p.hazards.indexOf('slippery') !== -1;
    var unsafeFloor = slippery || p.hazards.indexOf('uneven') !== -1;

    var base = baseChoice(p, group);
    var bopts = { season: winter ? 'winter' : 'summer', activity: 'long' };
    var workout = base.kind === 'method' ? Booklet.methodWorkout(base.id, 0, bopts) : Booklet.sessionWorkout(base.id, bopts);
    reasons.push(base.reason);

    var main = workout.phases.filter(function (ph) { return ph.name === 'Main'; })[0];
    Object.keys(SITE_DRILLS).forEach(function (feature) {
      if (p.features.indexOf(feature) === -1) return;
      SITE_DRILLS[feature].forEach(function (d) {
        main.exercises.push(siteExercise(d, slippery));
        reasons.push(d.reason);
      });
    });
    if (p.features.some(function (f) { return SITE_DRILLS[f]; })) workout.tags.push('site');

    var warm = workout.phases[0];
    if (p.width === 'wide' && group >= 6 && !unsafeFloor && p.hazards.indexOf('cars') === -1) {
      var game = Booklet.games('tag')[0];
      if (game) {
        warm.exercises.unshift({ name: game.he, id: null, sets: 1, reps: null, duration_seconds: 300, rest_seconds: null, notes: game.description });
        reasons.push('פתחתי ב' + game.he + ' כי השטח רחב והקבוצה גדולה (' + group + ')');
      }
    } else if (group >= 6 && p.width !== 'wide') {
      reasons.push('לא שילבתי משחקי תופסת או שליחים כי השטח לא רחב מספיק');
    }

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

  var api = {
    SITE_DRILLS: SITE_DRILLS,
    CAPACITY: CAPACITY,
    build: build
  };

  root.THSitePlan = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
