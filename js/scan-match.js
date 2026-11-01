/**
 * Deterministic environment-scan matching.
 * Vision models only supply tags. Which exercises fit, and the weekly days,
 * are computed here so GitHub Pages and the Python proxy agree.
 * Browser: window.THScan. Node: module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.THScan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var EQUIPMENT_TAGS = [
    'bodyweight', 'mat', 'bench', 'wall', 'medicine_ball', 'resistance_band', 'mini_band',
    'loop_band', 'dumbbell', 'kettlebell', 'pillow', 'chair', 'foam_roller', 'yoga_blocks',
    'plyo_box', 'wooden_box', 'bosu', 'weight_plate', 'wooden_dowel', 'power_rack',
    'water_bottle', 'soccer_ball', 'tennis_ball', 'small_ball', 'cones', 'discs', 'hoops',
    'jump_rope', 'pullup_bar', 'towel', 'sofa', 'basket', 'kitchen_floor'
  ];

  var TAG_LABELS = {
    bodyweight: 'משקל גוף', mat: 'מזרן', bench: 'ספסל', wall: 'קיר',
    medicine_ball: 'כדור כוח', resistance_band: 'גומיית התנגדות', mini_band: 'גומייה מיני',
    loop_band: 'גומיית לופ', dumbbell: 'משקולת', kettlebell: 'קטלבל', pillow: 'כרית',
    chair: 'כיסא', foam_roller: 'גליל עיסוי', yoga_blocks: 'קוביות יוגה',
    plyo_box: 'קופסת פליאו', wooden_box: 'קופסת עץ', bosu: 'בוסו', weight_plate: 'צלחת משקל',
    wooden_dowel: 'מוט עץ', power_rack: 'כלוב משקולות', water_bottle: 'בקבוק מים',
    soccer_ball: 'כדורגל', tennis_ball: 'כדור טניס', small_ball: 'כדור קטן',
    cones: 'קונוסים', discs: 'דיסקים', hoops: 'חישוקים', jump_rope: 'חבל קפיצה',
    pullup_bar: 'מוט מתח', towel: 'מגבת', sofa: 'ספה', basket: 'סל', kitchen_floor: 'רצפת מטבח'
  };

  var COCO_TAGS = {
    bench: ['bench'],
    chair: ['chair'],
    couch: ['sofa'],
    'sports ball': ['small_ball'],
    bottle: ['water_bottle']
  };

  var FOCUS = ['ליבה', 'חזה', 'גב', 'רגליים/ישבן', 'גוף מלא/HIIT', 'מוביליטי', 'אחר'];
  var TIP = 'השראה';

  function tagAllowed(tag) {
    return EQUIPMENT_TAGS.indexOf(tag) !== -1;
  }

  function uniqueTags(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (tag) {
      if (!tagAllowed(tag) || seen[tag]) return;
      seen[tag] = true;
      out.push(tag);
    });
    out.sort(function (a, b) { return EQUIPMENT_TAGS.indexOf(a) - EQUIPMENT_TAGS.indexOf(b); });
    return out;
  }

  function withBodyweight(tags) {
    return uniqueTags(['bodyweight'].concat(tags || []));
  }

  function isTip(ex) {
    return !ex || ex.muscle_group === TIP;
  }

  function requiredGear(ex) {
    return (ex.equipment_tags || []).filter(function (tag) { return tag !== 'bodyweight' && tagAllowed(tag); });
  }

  function hasTag(available, tag) {
    return (available || []).indexOf(tag) !== -1;
  }

  // An exercise fits when every gear tag it needs was detected.
  // Bodyweight is always available, so a mat-only exercise needs a mat,
  // and a bodyweight exercise needs nothing else.
  function exerciseFits(ex, availableTags) {
    if (isTip(ex)) return false;
    var have = withBodyweight(availableTags);
    return requiredGear(ex).every(function (tag) { return hasTag(have, tag); });
  }

  function matchScore(ex) {
    var gear = requiredGear(ex);
    if (!gear.length) return 0.55;
    return Math.round((0.7 + Math.min(gear.length, 3) * 0.1) * 100) / 100;
  }

  function shortCode(ex) {
    var id = String(ex.id || ex.exerciseId || '');
    return id.indexOf('ig-') === 0 ? id.slice(3) : id;
  }

  function byIdThenScore(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.code < b.code ? -1 : (a.code > b.code ? 1 : 0);
  }

  function matchExercises(exercises, availableTags) {
    var have = withBodyweight(availableTags);
    return (exercises || []).filter(function (ex) {
      return exerciseFits(ex, have);
    }).map(function (ex) {
      return {
        exercise: ex,
        code: shortCode(ex),
        score: matchScore(ex),
        muscle: ex.muscle_group
      };
    }).sort(byIdThenScore);
  }

  function takeForFocus(pool, focus, used, limit) {
    var picked = [];
    pool.forEach(function (row) {
      if (picked.length >= limit) return;
      if (row.muscle !== focus || used[row.code]) return;
      used[row.code] = true;
      picked.push(row);
    });
    return picked;
  }

  function buildWeeklyPlan(matches) {
    var pool = (matches || []).slice().sort(byIdThenScore);
    var counts = {};
    pool.forEach(function (row) { counts[row.muscle] = (counts[row.muscle] || 0) + 1; });
    var focuses = FOCUS.filter(function (muscle) { return counts[muscle]; });
    focuses.sort(function (a, b) {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return FOCUS.indexOf(a) - FOCUS.indexOf(b);
    });
    var days = [];
    var used = {};
    focuses.forEach(function (focus) {
      if (days.length >= 4) return;
      var picked = takeForFocus(pool, focus, used, 3);
      if (!picked.length) return;
      days.push({ focus: focus, exercises: picked });
    });
    if (!days.length && pool.length) {
      days.push({ focus: pool[0].muscle, exercises: pool.slice(0, 3) });
    }
    var plan = { days: days.length };
    days.forEach(function (day, i) {
      plan['day_' + (i + 1)] = {
        focus: day.focus,
        exercises: day.exercises.map(function (row) { return row.code; })
      };
    });
    return plan;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function clip01(n) {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return round2(n);
  }

  function className(pred) {
    return String((pred && (pred.class || pred.className)) || '').toLowerCase();
  }

  function tagsFromCoco(predictions, width, height) {
    var best = {};
    (predictions || []).forEach(function (pred) {
      var names = COCO_TAGS[className(pred)];
      if (!names) return;
      var score = Number(pred.score);
      if (!isFinite(score)) score = 0.5;
      var box = pred.bbox || pred.box;
      var bbox = null;
      if (box && box.length >= 4 && width && height) {
        var x = Number(box[0]) / width;
        var y = Number(box[1]) / height;
        var w = Number(box[2]) / width;
        var h = Number(box[3]) / height;
        bbox = [clip01(x), clip01(y), clip01(x + w), clip01(y + h)];
      }
      names.forEach(function (tag) {
        if (!best[tag] || score > best[tag].confidence) {
          best[tag] = { tag: tag, confidence: round2(score), bbox: bbox };
        }
      });
    });
    return EQUIPMENT_TAGS.filter(function (tag) { return best[tag]; }).map(function (tag) {
      var row = { tag: tag, confidence: best[tag].confidence };
      if (best[tag].bbox) row.bbox = best[tag].bbox;
      return row;
    });
  }

  function environmentFromCoco(predictions) {
    var names = {};
    (predictions || []).forEach(function (pred) {
      if (Number(pred.score) >= 0.4 || pred.score == null) names[className(pred)] = true;
    });
    var type = 'room';
    var floor = 'tiles';
    var space = 'medium';
    if (names.bench && !names.couch && !names.bed) {
      type = names['sports ball'] ? 'park' : 'gym';
      floor = type === 'park' ? 'grass' : 'concrete';
      space = 'medium';
    } else if (names['potted plant'] && names['sports ball'] && !names.couch) {
      type = 'park';
      floor = 'grass';
      space = 'large';
    } else if (names.couch || names.bed || names.tv) {
      type = 'room';
      floor = 'wood';
      space = names.bed ? 'small' : 'medium';
    } else if ((names.car || names.truck) && !names.couch) {
      type = 'outdoor_turf';
      floor = 'grass';
      space = 'large';
    }
    var he = {
      park: 'שטח פתוח, נראה כמו פארק',
      room: space === 'small' ? 'חדר קטן' : 'חדר פנימי',
      balcony: 'מרפסת',
      gym: 'חלל עם ספסל, נראה כמו חדר כושר',
      outdoor_turf: 'שטח חיצוני פתוח'
    };
    return {
      type: type,
      floor: floor,
      space: space,
      description_he: he[type] || 'הסביבה סומנה ידנית'
    };
  }

  function manualEnvironment() {
    return {
      type: 'room',
      floor: 'tiles',
      space: 'medium',
      description_he: 'הציוד סומן ידנית, בלי תיאור מהתמונה'
    };
  }

  function notesHe(equipment, matchCount, available) {
    var fromDetect = (equipment || []).map(function (row) { return TAG_LABELS[row.tag] || row.tag; });
    var fromChips = (available || []).filter(function (tag) { return tag !== 'bodyweight'; }).map(function (tag) {
      return TAG_LABELS[tag] || tag;
    });
    var gear = fromDetect.length ? fromDetect : fromChips;
    var seen = gear.length
      ? 'הציוד הזמין: ' + gear.join(', ') + '. '
      : 'בלי ציוד מלבד משקל גוף. ';
    return seen + matchCount + ' תרגילים מהספרייה מתאימים למה שיש במקום.';
  }

  function buildScanResult(exercises, input) {
    input = input || {};
    var detected = (input.detected_equipment || []).filter(function (row) {
      return row && tagAllowed(row.tag);
    }).map(function (row) {
      var clean = { tag: row.tag, confidence: round2(Number(row.confidence) || 0) };
      if (Array.isArray(row.bbox) && row.bbox.length === 4) clean.bbox = row.bbox.map(clip01);
      return clean;
    });
    var available = withBodyweight((input.available_tags || []).concat(detected.map(function (row) { return row.tag; })));
    var env = input.detected_environment || manualEnvironment();
    var matched = matchExercises(exercises, available);
    var plan = buildWeeklyPlan(matched);
    return {
      detected_environment: {
        type: env.type || 'room',
        floor: env.floor || 'tiles',
        space: env.space || 'medium',
        description_he: env.description_he || manualEnvironment().description_he
      },
      detected_equipment: detected,
      available_tags: available,
      matching_exercises: matched.map(function (row) {
        var ex = row.exercise;
        return {
          reel_url: ex.source_url,
          name_he: ex.name_he,
          muscle_group: ex.muscle_group,
          required_tags: (ex.equipment_tags || []).slice(),
          sets_reps: ex.sets_reps,
          poster_file: ex.poster || '',
          match_score: row.score
        };
      }),
      suggested_weekly_plan: plan,
      notes_he: input.notes_he || notesHe(detected, matched.length, available)
    };
  }

  function workoutsFromPlan(plan, exercises) {
    var byCode = {};
    (exercises || []).forEach(function (ex) { byCode[shortCode(ex)] = ex; });
    var days = [];
    var count = Math.max(0, Number(plan && plan.days) || 0);
    var i;
    for (i = 1; i <= count; i++) {
      var day = plan['day_' + i];
      if (!day || !Array.isArray(day.exercises)) continue;
      days.push({
        id: 'scan_day_' + i,
        title: 'יום ' + i + ' · ' + (day.focus || ''),
        savedAt: 'scan',
        exercises: day.exercises.map(function (code) {
          var ex = byCode[code];
          if (!ex || isTip(ex)) return null;
          return {
            exerciseId: ex.id,
            name_he: ex.name_he,
            muscle_group: ex.muscle_group,
            sets: ex.sets,
            reps: ex.reps || '',
            equipment: ex.equipment || '',
            source_url: ex.source_url,
            creator: ex.creator,
            poster: ex.poster || '',
            poster_uncertain: !!ex.poster_uncertain,
            steps_he: ex.steps_he || []
          };
        }).filter(Boolean)
      });
    }
    return days.filter(function (day) { return day.exercises.length; });
  }

  function mergeScanWorkouts(existing, scanWorkouts) {
    var rest = (existing || []).filter(function (w) { return !w || !/^scan_day_/.test(w.id); });
    return rest.concat(scanWorkouts || []);
  }

  return {
    EQUIPMENT_TAGS: EQUIPMENT_TAGS,
    TAG_LABELS: TAG_LABELS,
    FOCUS: FOCUS,
    tagAllowed: tagAllowed,
    withBodyweight: withBodyweight,
    exerciseFits: exerciseFits,
    matchExercises: matchExercises,
    buildWeeklyPlan: buildWeeklyPlan,
    tagsFromCoco: tagsFromCoco,
    environmentFromCoco: environmentFromCoco,
    manualEnvironment: manualEnvironment,
    buildScanResult: buildScanResult,
    workoutsFromPlan: workoutsFromPlan,
    mergeScanWorkouts: mergeScanWorkouts
  };
});
