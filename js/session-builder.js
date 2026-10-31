/**
 * Build a workout from a Hebrew prompt + the unified catalog.
 * Client-side only. If the library cannot satisfy the request, say so
 * and offer the closest thing. Never fabricates outcomes.
 * Classic script. Namespace: window.THEngine
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  var Prompt = root.THPrompt;
  var Analyzer = root.THAnalyzer;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
    Prompt = require('./prompt-parser.js');
    Analyzer = require('./analyzer.js');
  }

  var RX = {
    strength: { sets: 4, reps: '4-6', rest: 120 },
    hypertrophy: { sets: 3, reps: '8-12', rest: 60 },
    endurance: { sets: 3, reps: '12-15', rest: 45 },
    core: { sets: 3, reps: null, rest: 30, duration: 40 }
  };

  function catalogList(explicit) {
    if (Array.isArray(explicit)) return explicit;
    if (explicit && typeof explicit === 'object' && !explicit.id) {
      return Object.keys(explicit).filter(function (k) {
        return k.charAt(0) !== '_';
      }).map(function (id) {
        var e = explicit[id] || {};
        return Object.assign({ id: e.id || id }, e);
      });
    }
    if (root.TH && typeof root.TH.catalogList === 'function') return root.TH.catalogList();
    return [];
  }

  function isPlayable(e) {
    if (!e) return false;
    if (root.TH && typeof root.TH.isPlayable === 'function') return root.TH.isPlayable(e);
    return !!(e.file || e.driveId || e.youtubeId);
  }

  function foldName(e) {
    return Infer.fold((e && (e.he || e.id)) || '');
  }

  function prescription(req) {
    if (req.goal && RX[req.goal]) return RX[req.goal];
    if (req.focus === 'core') return RX.core;
    return RX.hypertrophy;
  }

  function repMid(reps) {
    var m = String(reps == null ? '' : reps).match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (!m) return 0;
    var lo = Number(m[1]);
    var hi = m[2] ? Number(m[2]) : lo;
    return (lo + hi) / 2;
  }

  // Seconds one exercise takes in workout mode: every set is followed by its
  // rest, and a reps set is counted at ~3 s per rep.
  function exerciseSeconds(rx) {
    var sets = Number(rx && rx.sets) || 1;
    var work = Number(rx && rx.duration) || repMid(rx && rx.reps) * 3 || 30;
    var rest = Number(rx && rx.rest) || 0;
    return sets * (work + rest);
  }

  // The duration steps were calibrated on the default prescription (3 sets of
  // 8-12 with 60 s rest, about 4.5 min per exercise). A heavier prescription
  // kept the same step: strength is 4 sets with 120 s rest, twice as long, so
  // a «20 minute» strength session carried 5 exercises and 40 minutes of rest
  // alone. The count shrinks by the ratio of the two, never below 2 and never
  // above the step. Without a prescription the steps are returned as they are.
  // Past 45 minutes the step used to stop at 10, so «אימון שעה וחצי» put 10
  // exercises (about 45 minutes) into an 85-minute Main phase and «אימון כוח
  // 90 דקות» ran 48 minutes. A longer session gets one more exercise for every
  // 4.5 minutes of Main phase (the duration less the 5-minute warm-up).
  function wantedCount(duration, rx) {
    var d = Number(duration) || 20;
    var base = d <= 10 ? 3 : d <= 20 ? 5 : d <= 30 ? 6 : d <= 45 ? 8
      : Math.max(10, Math.floor((d - 5) * 60 / exerciseSeconds(RX.hypertrophy)));
    if (!rx) return base;
    var ratio = exerciseSeconds(RX.hypertrophy) / exerciseSeconds(rx);
    return Math.max(2, Math.min(base, Math.floor(base * ratio)));
  }

  // The count never drops below 2, so a short Main phase could not hold even
  // one round of the prescription: «אימון כוח לגב 10 דקות» left 5 minutes for
  // 2 exercises of 4 sets with 120 s rest (about 18 minutes), and «אימון 5
  // דקות» put 3 x 3 sets (about 13 minutes) into 5. When the exercises do not
  // fit, each one gets as many sets as the minutes allow, at least 1; a phase
  // with room keeps the prescription as it is.
  function fitSets(rx, count, minutes) {
    var n = Math.max(1, Number(count) || 1);
    var budget = Math.max(0, Number(minutes) || 0) * 60;
    var perSet = exerciseSeconds(Object.assign({}, rx, { sets: 1 }));
    var sets = Number(rx.sets) || 1;
    if (!budget || n * sets * perSet <= budget) return rx;
    return Object.assign({}, rx, { sets: Math.max(1, Math.floor(budget / (n * perSet))) });
  }

  // fitSets gives every exercise the same count, so a phase a little short
  // for the full prescription lost a whole set on all of them: «אימון 30
  // דקות» had 6 exercises in a 25-minute Main phase, 3 sets of each needed 27
  // minutes, all 6 fell to 2 sets and the session ran 18 minutes («אימון 40
  // דקות»: 24 of 35). The sets that fit are handed out one by one instead, so
  // the first exercises keep the prescription and only the last ones get one
  // set less. Returns the sets of each exercise, in order.
  function fitSetsEach(rx, count, minutes) {
    var n = Math.max(1, Number(count) || 1);
    var sets = Number(rx.sets) || 1;
    var even = fitSets(rx, n, minutes);
    var out = [];
    var i;
    if (even === rx) {
      for (i = 0; i < n; i++) out.push(sets);
      return out;
    }
    var perSet = exerciseSeconds(Object.assign({}, rx, { sets: 1 }));
    var total = Math.floor(Math.max(0, Number(minutes) || 0) * 60 / perSet);
    var base = Number(even.sets);
    var extra = Math.max(0, Math.min(n * (sets - base), total - n * base));
    for (i = 0; i < n; i++) out.push(i < extra ? base + 1 : base);
    return out;
  }

  function groupPlan(participants, exerciseCount) {
    var people = Math.max(1, Math.floor(Number(participants) || 1));
    var available = Math.max(1, Math.floor(Number(exerciseCount) || 1));
    if (people === 1) return null;
    var stations = Math.min(available, Math.max(1, Math.ceil(people / 4)));
    var perStation = Math.ceil(people / stations);
    // תחנה אחת (2-4 חניכים, או מאגר עם תרגיל יחיד): אין בין מה להחליף,
    // אז לא מבקשים להחליף תחנה ולא כותבים «1 תחנות».
    var he = stations === 1
      ? people + ' חניכים: תחנה אחת, כולם מבצעים את אותו התרגיל יחד.'
      : people + ' חניכים: ' + stations + ' תחנות, עד ' + perStation + ' חניכים בתחנה. החליפו תחנה בסיום כל סט.';
    return {
      stations: stations,
      per_station: perStation,
      he: he
    };
  }

  function matchesEquipment(entry, wanted) {
    var have = entry.equipment && entry.equipment.length ? entry.equipment : ['none'];
    if (!wanted || !wanted.length) return true;
    if (wanted.indexOf('none') !== -1 && wanted.length === 1) {
      return have.indexOf('none') !== -1 || have.indexOf('wall') !== -1;
    }
    return wanted.some(function (eq) {
      return have.indexOf(eq) !== -1;
    });
  }

  function muscleOverlap(entry, muscles) {
    if (!muscles || !muscles.length) return 1;
    var have = entry.muscles || [];
    var n = 0;
    for (var i = 0; i < have.length; i++) {
      if (muscles.indexOf(have[i]) !== -1) n++;
    }
    return n;
  }

  function nameHints(entry, req) {
    var blob = foldName(entry) + ' ' + Infer.fold(entry.folder || '');
    var score = 0;
    if (req.focus === 'core' && /בטן|פלאנק|ליבה|מטפס/.test(blob)) score += 6;
    if ((req.focus === 'legs' || req.focus === 'lower') && /רגל|ירכ|סולם|מדרג|ארבע|ישבן|גשר/.test(blob)) score += 6;
    // «גב» and «יד» are matched as words (with a ו/ה/ב/ל prefix): as plain
    // substrings «פלאנק גבוה» (a core clip) was hinted as back and «פלאנק
    // צידי» as arms, and both were let into those sessions with the reason
    // «השם והתיקייה מתאימים לבקשה».
    if (req.focus === 'back' && /(^|[^א-ת])[והבל]?גב(?!וה)|מתח|אוסטרל/.test(blob)) score += 6;
    if (req.focus === 'arms' && /(^|[^א-ת])[והבל]?יד|שכיב|כוח ידיים/.test(blob)) score += 6;
    if (req.focus === 'chest' && /חזה|שכיב/.test(blob)) score += 6;
    if (req.focus === 'shoulders' && /כתף|כתפי/.test(blob)) score += 6;
    if (req.audience === 'kids' && /ילד/.test(blob)) score += 4;
    if (req.audience === 'partner' && /זוג/.test(blob)) score += 4;
    return score;
  }

  function sourceBonus(entry) {
    if (entry.source === 'onedrive') return 6;
    if (entry.source === 'drive') return 5;
    if (entry.source === 'youtube') return 2;
    if (entry.file) return 1;
    return 0;
  }

  // Ids the caller would rather see, as a lookup. Pilot mode passes the clips
  // the Acharai booklet teaches (THPilot.builderOpts), so between two clips that
  // fit the request equally well the one the coach was trained on wins. The
  // bonus stays below one muscle match, so it never pulls in a wrong exercise.
  var PREFER_BONUS = 8;

  function preferMap(prefer) {
    if (!prefer) return null;
    if (!Array.isArray(prefer)) return typeof prefer === 'object' ? prefer : null;
    if (!prefer.length) return null;
    var map = {};
    prefer.forEach(function (id) { if (id) map[id] = true; });
    return map;
  }

  function scoreEntry(entry, req, prefer) {
    var score = 0;
    var preferred = preferMap(prefer);
    if (preferred && entry && preferred[entry.id]) score += PREFER_BONUS;
    var overlap = muscleOverlap(entry, req.muscles);
    if (req.muscles && req.muscles.length > 1) {
      // Two or more muscles («אימון רגליים וגב»): a full-body clip that lists
      // them all matched twice (24) and beat every clip built for one of them
      // (12 + the name hint), so the session was 5 full-body clips with no
      // legs or back exercise. A match counts once, and a clip whose main
      // muscle is one of those asked gets the bonus instead.
      score += overlap ? 12 : -8;
      if (entry.muscles && req.muscles.indexOf(entry.muscles[0]) !== -1) score += 8;
    } else if (req.muscles && req.muscles.length) {
      score += overlap * 12;
      if (overlap === 0) score -= 8;
    }
    score += nameHints(entry, req);
    if (req.equipment && req.equipment.length) {
      if (matchesEquipment(entry, req.equipment)) score += 10;
      else score -= 15;
    }
    if (req.level && entry.level === req.level) score += 3;
    if (req.level === 'beginner' && entry.level === 'advanced') score -= 4;
    score += sourceBonus(entry);
    if (/חימום/.test(foldName(entry)) && req.focus !== 'full') score -= 2;
    return score;
  }

  function filterPool(list, req, relax) {
    relax = relax || {};
    return list.filter(function (e) {
      if (!e || !e.he) return false;
      if (Infer.isBlockedName(e.he) || Infer.isBlockedName(e.id)) return false;
      if (!relax.playable && !isPlayable(e) && e.source !== 'link') return false;
      if (e.source === 'link') return false;
      if (!relax.equipment && req.equipment && req.equipment.length && !matchesEquipment(e, req.equipment)) {
        return false;
      }
      // A clip whose main muscle the prompt ruled out («בלי רגליים») stays out.
      if (!relax.muscle && req.excludedMuscles && req.excludedMuscles.length &&
          e.muscles && req.excludedMuscles.indexOf(e.muscles[0]) !== -1) {
        return false;
      }
      if (!relax.muscle && req.muscles && req.muscles.length) {
        var overlap = muscleOverlap(e, req.muscles);
        var hinted = nameHints(e, req) >= 6;
        if (overlap === 0 && !hinted) return false;
      }
      if (!relax.level && req.level && e.level && e.level !== req.level) {
        if (!(req.level === 'intermediate' && e.level === 'beginner')) return false;
      }
      return true;
    });
  }

  // The muscle group a pick "spends" when the request names no muscle (a
  // full-body or unfocused prompt), or null when it names one. The catalog is
  // core-heavy (25 of its 78 clips) and without a muscle in the request every
  // clip scores the same, so «אימון גוף מלא 45 דקות» came out 7 of 8 core
  // (crunches variants) and the analyzer flagged its own result
  // «88% ליבה, אין עבודת גב». With a group on each row pickDiverse takes the
  // best clip of every group before the second clip of any group. A request
  // that names one muscle keeps the plain score order, where the muscle match
  // already decides. A request that names several spreads over them: the
  // group is the asked muscle the clip is built for (its main muscle, else
  // the first asked one it lists), so «אימון רגליים וגב» takes back clips too
  // and not only the legs clips the name hint ranks first.
  function spreadGroup(entry, req) {
    var muscles = (entry && entry.muscles) || [];
    if (req.muscles && req.muscles.length > 1) {
      if (muscles.length && req.muscles.indexOf(muscles[0]) !== -1) return muscles[0];
      for (var i = 0; i < muscles.length; i++) {
        if (req.muscles.indexOf(muscles[i]) !== -1) return muscles[i];
      }
      return 'other';
    }
    if (req.muscles && req.muscles.length) return null;
    return muscles.length ? muscles[0] : 'other';
  }

  function pickDiverse(scored, count) {
    var picked = [];
    var usedName = {};
    var usedPattern = {};
    var usedGroup = {};
    scored.sort(function (a, b) { return b.score - a.score; });
    function take(pred) {
      // One round takes at most one clip per group (rows without a group are
      // never held back). Rounds repeat until the count is reached or a round
      // takes nothing.
      var round = 0;
      var took = true;
      while (took && picked.length < count) {
        took = false;
        for (var i = 0; i < scored.length && picked.length < count; i++) {
          var e = scored[i].entry;
          var name = foldName(e);
          if (usedName[name]) continue;
          if (pred && !pred(e, scored[i])) continue;
          var group = scored[i].group;
          if (group != null && (usedGroup[group] || 0) > round) continue;
          usedName[name] = true;
          if (group != null) usedGroup[group] = round + 1;
          var inf = Infer.inferFromName(e.he, { folder: e.folder || '' });
          usedPattern[inf.pattern] = (usedPattern[inf.pattern] || 0) + 1;
          picked.push(e);
          took = true;
          if (root.THIngest && typeof root.THIngest.patternScore === 'function') {
            scored.forEach(function (row) {
              row.score += root.THIngest.patternScore(e.id, row.entry.id);
            });
          }
        }
        round++;
      }
    }
    take(function (e, row) { return row.score >= 10; });
    take(null);
    return picked;
  }

  function findWarmup(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === 'warmup' || Infer.fold(list[i].he) === 'חימום') return list[i];
    }
    for (var j = 0; j < list.length; j++) {
      if (/חימום/.test(foldName(list[j]))) return list[j];
    }
    return null;
  }

  function toExercise(entry, rx) {
    var inf = Infer.inferFromName(entry.he, { folder: entry.folder || '' });
    var timeBased = inf.load === 'time' || rx.duration;
    return {
      name: entry.he,
      id: entry.id,
      sets: rx.sets,
      reps: timeBased ? null : rx.reps,
      duration_seconds: timeBased ? (rx.duration || 40) : null,
      rest_seconds: rx.rest,
      notes: null
    };
  }

  function whyChosen(entry, req) {
    var bits = [];
    var overlap = muscleOverlap(entry, req.muscles);
    if (overlap) {
      bits.push('עובד על ' + (entry.muscles || []).map(function (m) {
        return Infer.MUSCLE_LABELS[m] || m;
      }).join(', '));
    } else if (nameHints(entry, req) >= 6) {
      bits.push('השם והתיקייה מתאימים לבקשה');
    }
    if (req.equipment && req.equipment.length && matchesEquipment(entry, req.equipment)) {
      bits.push('מתאים לציוד שביקשת');
    }
    if (entry.source === 'onedrive') bits.push('מסרטון OneDrive שאומת ופורסם לנגן');
    else if (entry.source === 'drive') bits.push('מהמאגר האמיתי בדרייב');
    else if (entry.source === 'youtube') bits.push('סרטון יוטיוב שנשמר במאגר');
    else if (entry.file) bits.push('קליפ מקומי במאגר');
    var inf = Infer.inferFromName(entry.he, { folder: entry.folder || '' });
    if (inf.pattern && Infer.PATTERN_LABELS[inf.pattern]) {
      bits.push('דפוס ' + Infer.PATTERN_LABELS[inf.pattern]);
    }
    return bits.join(' · ') || 'זמין במאגר ומתאים לבקשה';
  }

  // Focus values that are not a single muscle key (see THPrompt.parseMuscles).
  var FOCUS_LABELS = {
    full: 'גוף מלא',
    arms: 'ידיים',
    upper: 'פלג גוף עליון',
    lower: 'פלג גוף תחתון'
  };

  // A request that names several muscles is labelled with all of them, in the
  // order named: «אימון רגליים וגב» was titled «אימון רגליים» (the focus is
  // only the first muscle). Biceps and triceps together read «ידיים».
  function focusLabel(req) {
    if (!req || !req.focus) return '';
    if (FOCUS_LABELS[req.focus] && req.focus !== 'arms') return FOCUS_LABELS[req.focus];
    var muscles = req.muscles || [];
    var arms = muscles.indexOf('biceps') !== -1 && muscles.indexOf('triceps') !== -1;
    var labels = [];
    muscles.forEach(function (m) {
      var label = (arms && (m === 'biceps' || m === 'triceps')) ? FOCUS_LABELS.arms : Infer.MUSCLE_LABELS[m];
      if (label && labels.indexOf(label) === -1) labels.push(label);
    });
    if (labels.length < 2) return FOCUS_LABELS[req.focus] || Infer.MUSCLE_LABELS[req.focus] || '';
    return labels.slice(0, -1).join(', ') + ' ו' + labels[labels.length - 1];
  }

  // «1 דקות» is not Hebrew: one minute is «דקה» («אימון 1 דקה» was titled
  // «אימון גוף מלא · 1 דקות»).
  function minutesLabel(minutes) {
    return Number(minutes) === 1 ? 'דקה' : minutes + ' דקות';
  }

  function typeLabel(req, analysis) {
    var parts = [];
    parts.push(focusLabel(req) || 'אימון מהמאגר');
    if (req.equipment && req.equipment[0] === 'none') parts.push('משקל גוף');
    else if (req.equipment && req.equipment[0] && Infer.EQ_LABELS[req.equipment[0]]) {
      parts.push(Infer.EQ_LABELS[req.equipment[0]]);
    }
    parts.push(minutesLabel(req.duration || analysis.durationMinutes || 20));
    if (Number(req.participants) > 1) parts.push(req.participants + ' חניכים');
    if (req.level && Infer.LEVEL_LABELS[req.level]) parts.push(Infer.LEVEL_LABELS[req.level]);
    return parts.join(' · ');
  }

  // Shown whenever the result is only "the closest thing": a filter had to be
  // relaxed, or the pool was too small to fill even a minimal session. Before
  // this the notice keyed on relax alone, so a request whose pool held 2
  // matching clips (nothing relaxed, 2 picked) returned closest:true with
  // notice:null and the page showed a 45-minute plan of 2 exercises in silence.
  function closestNotice(req, picked) {
    var want = [];
    if (focusLabel(req)) want.push(focusLabel(req));
    if (req.equipment && req.equipment[0] && Infer.EQ_LABELS[req.equipment[0]]) {
      want.push(Infer.EQ_LABELS[req.equipment[0]]);
    }
    if (req.level && Infer.LEVEL_LABELS[req.level]) want.push('רמת ' + Infer.LEVEL_LABELS[req.level]);
    var got = picked.length
      // A single fitting clip read «(1 תרגילים)».
      ? 'הנה הקרוב ביותר מתוך הסרטונים שיש במאגר (' +
        (picked.length === 1 ? 'תרגיל אחד' : picked.length + ' תרגילים') + ').'
      : 'אין במאגר תרגיל שמתאים.';
    return 'אין במאגר מספיק סרטונים לבקשה' +
      (want.length ? ' («' + want.join(' · ') + '»)' : '') +
      '. ' + got;
  }

  // The analyzer's balance flags judge a session as if it were full-body. On
  // a request that names its muscles they told the trainer off for exactly
  // what was asked: «אימון ליבה 20 דקות» got «100% ליבה, אין עבודת גב» and
  // «אימון רגליים» got «אין תרגילי משיכה». A balance flag stays only when the
  // request names a muscle it complains about (asked for back, got all core);
  // «חסר חימום» and unfocused prompts keep every flag.
  var FLAG_MUSCLES = {
    'core-heavy-no-back': ['back'],
    'core-heavy': ['back', 'chest', 'shoulders', 'biceps', 'triceps', 'legs'],
    'no-pull': ['back', 'biceps'],
    'no-push': ['chest', 'shoulders', 'triceps'],
    'no-posterior': ['back', 'legs']
  };

  function requestFlags(flags, req) {
    var asked = (req && req.muscles) || [];
    if (!asked.length) return flags || [];
    return (flags || []).filter(function (f) {
      var about = FLAG_MUSCLES[f.key];
      if (!about) return true;
      return about.some(function (m) { return asked.indexOf(m) !== -1; });
    });
  }

  function buildSession(text, catalogOrList, opts) {
    opts = opts || {};
    var prefer = preferMap(opts.prefer);
    var req = typeof text === 'string' ? Prompt.parsePrompt(text) : (text || Prompt.parsePrompt(''));
    var list = catalogList(catalogOrList);
    var rx = prescription(req);
    var need = wantedCount(req.duration, rx);
    var relax = { muscle: false, equipment: false, level: false };
    // The designated warm-up clip belongs to the Warm-up phase only. Without
    // this it scored into the Main phase of full-body / unfocused prompts as
    // 3 sets x 8-12 reps of "warm-up", and the Warm-up phase came out empty.
    var warmup = findWarmup(list);
    var mainList = warmup ? list.filter(function (e) {
      return foldName(e) !== foldName(warmup);
    }) : list;
    // The other warm-up drills («חימום שכיבות שמיכה קונוסים על הגב», «כדורגל
    // חימום») stay out of Main too: «אימון חזה» prescribed the cone warm-up as
    // 3 x 8-12 next to the push-ups. Only a catalog with nothing else keeps them.
    var notWarmups = mainList.filter(function (e) { return !/חימום/.test(foldName(e)); });
    if (notWarmups.length) mainList = notWarmups;
    var pool = filterPool(mainList, req, relax);
    if (pool.length < 2 && req.level) {
      relax.level = true;
      pool = filterPool(mainList, req, relax);
    }
    if (pool.length < 2 && req.equipment && req.equipment.length) {
      relax.equipment = true;
      pool = filterPool(mainList, req, relax);
    }
    if (pool.length < 2 && req.muscles && req.muscles.length) {
      relax.muscle = true;
      pool = filterPool(mainList, req, relax);
    }
    var scored = pool.map(function (e) {
      return { entry: e, score: scoreEntry(e, req, prefer), group: spreadGroup(e, req) };
    });
    var picked = pickDiverse(scored, need);
    // Satisfied means exactly what the request asked for, in enough clips:
    // nothing relaxed (level included - a relaxed level already produces a
    // notice, so satisfied:true next to it was a contradiction) and at least
    // the minimal session length.
    var relaxed = relax.muscle || relax.equipment || relax.level;
    var satisfied = !relaxed && picked.length >= Math.min(3, need);
    if (picked.length === 0) {
      return {
        request: req,
        satisfied: false,
        closest: false,
        notice: 'אין במאגר סרטון שמתאים לבקשה הזו. אפשר לנסות קבוצת שריר אחרת, או להוסיף סרטון במסך ניהול מאגר.',
        workout: null,
        explanation: null,
        analysis: null
      };
    }

    // Phase minutes add up to the requested duration: the warm-up block gets
    // up to 5 minutes (at most half the session, and only when the 3-minute
    // warm-up clip fits), the Main phase gets the rest. Before this the plan
    // was Warm-up 5 + Main (duration - 10) + Cool-down 0, which left 5 minutes
    // unaccounted for and showed a 5-minute warm-up block with no clip in it.
    var totalMinutes = Math.max(1, Math.floor(Number(req.duration) || 20));
    var warmMinutes = Math.min(5, Math.floor(totalMinutes / 2));
    var warmEx = [];
    if (warmup && isPlayable(warmup) && warmMinutes >= 3) {
      warmEx.push({
        name: warmup.he,
        id: warmup.id,
        sets: 1,
        reps: null,
        duration_seconds: 180,
        rest_seconds: null,
        notes: null
      });
    }

    var title = focusLabel(req) ? ('אימון ' + focusLabel(req)) : 'אימון מהמאגר';
    if (req.durationSpecified) title += ' · ' + minutesLabel(req.duration);
    if (!warmEx.length) warmMinutes = 0;

    var mainMinutes = totalMinutes - warmMinutes;
    var setsEach = fitSetsEach(rx, picked.length, mainMinutes);
    var mainEx = picked.map(function (e, i) {
      return toExercise(e, Object.assign({}, rx, { sets: setsEach[i] }));
    });

    var workout = {
      title: title,
      duration_minutes: req.duration,
      participants: Math.max(1, Math.floor(Number(req.participants) || 1)),
      equipment: (req.equipment || []).map(function (e) { return Infer.EQ_LABELS[e] || e; }),
      intensity: req.goal === 'strength' ? 'high' : (req.level === 'beginner' ? 'low' : 'medium'),
      tags: [req.focus || 'general', req.goal || 'catalog'].filter(Boolean),
      goal: req.goal || null,
      phases: [
        { name: 'Warm-up', duration_minutes: warmMinutes, exercises: warmEx },
        { name: 'Main', duration_minutes: mainMinutes, exercises: mainEx },
        { name: 'Cool-down', duration_minutes: 0, exercises: [] }
      ],
      source: 'prompt-engine'
    };
    workout.group_plan = groupPlan(workout.participants, mainEx.length);

    var analysis = Analyzer.analyzeSession(workout);
    analysis.flags = requestFlags(analysis.flags, req);
    var reasons = picked.map(function (e) {
      return { id: e.id, he: e.he, why: whyChosen(e, req), source: e.source || 'local' };
    });
    var explanation = {
      type: typeLabel(req, analysis),
      primary: analysis.primary,
      secondary: analysis.secondary,
      stimulus: analysis.stimulus,
      reasons: reasons,
      flags: analysis.flags,
      volume: analysis.volume,
      pushPull: analysis.pushPull
    };

    return {
      request: req,
      satisfied: satisfied,
      closest: !satisfied,
      notice: satisfied ? null : closestNotice(req, picked),
      workout: workout,
      explanation: explanation,
      analysis: analysis
    };
  }

  // prescription + wantedCount are exported so the rules panel can quote the
  // numbers this engine actually runs instead of keeping a second copy of them.
  var api = {
    buildSession: buildSession,
    scoreEntry: scoreEntry,
    groupPlan: groupPlan,
    prescription: prescription,
    wantedCount: wantedCount
  };
  root.THEngine = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
