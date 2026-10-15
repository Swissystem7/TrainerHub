/**
 * Ingest a pasted Hebrew workout: parse sets/reps/rest, match catalog
 * clips (synonyms + common misspellings), flag unmatched for filming.
 * Also user-assisted clip segmentation. No vision model.
 * Classic script. Namespace: window.THIngest
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  var Analyzer = root.THAnalyzer;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
    try { Analyzer = require('./analyzer.js'); } catch (e) { Analyzer = null; }
  }

  function th() { return root.TH || (typeof module === 'object' ? require('./core.js') : null); }

  function toInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  // "הפסקה" (break) is used for rest as often as "מנוחה" in trainers' messages.
  var REST_RX = /מנוחה|הפסקה/;

  // The rest clause of one line: «מנוחה 30 שניות», «עם 60 שניות מנוחה»,
  // «מנוחה של דקה בין הסטים», «מנוחה 1:00». A line that holds nothing else is
  // a rest line; an exercise line keeps its name and takes the clause as its rest.
  var TIME_UNIT = '(?:שניות|שנייה|שניה|שנ(?:[׳\']|(?![\\u0590-\\u05FF]))|דקות|דקה|דק[׳\'])';
  var TIMED = '(?:\\d{1,2}:[0-5]\\d|\\d+\\s*' + TIME_UNIT + '(?:\\s*וחצי)?|(?:שתי\\s*דקות|דקה)\\s*וחצי|חצי\\s*דקה|שתי\\s*דקות|דקה(?:\\s+אחת)?)';
  var REST_FILLER = '(?:\\s+(?:של|פעילה|קצרה|ארוכה|בין\\s+(?:ה?סטים|ה?סבבים|ה?תרגילים|כל\\s+(?:סט|סבב|תרגיל))|(?:ל|אחרי\\s+)כל\\s+ה?(?:סט|סבב|תרגיל)))*';
  var REST_AFTER_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?:מנוחה|הפסקה)' + REST_FILLER + '(?:(?:\\s*[:\\-–]\\s*|\\s+)(?:' + TIMED + '|\\d+(?![\\d:])))?' + REST_FILLER);
  // «עבודה 40 שניות», «עבודה: 40», «40 שניות עבודה»: the work time of an interval paste.
  var WORK_RX = new RegExp('עבודה\\s*[:\\-–]?\\s*(?:' + TIMED + '|\\d+(?![\\d:]))|' + TIMED + '\\s*עבודה');
  var REST_BEFORE_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?' + TIMED + '\\s+(?:מנוחה|הפסקה)' + REST_FILLER);
  // «30 שניות לכל תרגיל», «כל תרגיל 45 שניות», «דקה על כל תרגיל»: the work time of every
  // exercise in the paste. Not a rest: «מנוחה 30 שניות לכל תרגיל», «מנוחה בין כל תרגיל 30 שניות».
  var PER_EXERCISE = '(?<![\\u0590-\\u05FF])(?<!בין\\s+)(?:[לב]|על\\s+)?כל\\s+ה?תרגיל(?![\\u0590-\\u05FF])';
  var PER_EXERCISE_WORK_RX = new RegExp('(?<!(?:מנוחה|הפסקה)[\\s:\\-–]*)(?<![\\d:])(' + TIMED + ')\\s*' + PER_EXERCISE + '|' +
    PER_EXERCISE + '\\s*[:\\-–]?\\s*(' + TIMED + ')(?!\\s*(?:מנוחה|הפסקה))');

  function timedSeconds(s) {
    var t = String(s || '');
    var clock = t.match(/(\d{1,2}):([0-5]\d)/);
    if (clock) return toInt(clock[1]) * 60 + toInt(clock[2]);
    var half = /וחצי/.test(t) ? 30 : 0;
    if (/חצי\s*דקה/.test(t)) return 30;
    if (/שתי\s*דקות/.test(t)) return 120 + half;
    var m = t.match(/(\d+)\s*(?:דקות|דקה|דק[׳'])/);
    if (m) return toInt(m[1]) * 60 + half;
    if (/דקה/.test(t)) return 60 + half;
    m = t.match(/(\d+)/);
    return m ? toInt(m[1]) + half : null;
  }

  function splitRest(s) {
    var t = String(s || '');
    if (!REST_RX.test(t)) return { found: false, rest: null, text: t };
    var m = t.match(REST_AFTER_RX);
    var secs = m ? parseRestSeconds(m[0]) : null;
    if (secs == null) {
      var before = t.match(REST_BEFORE_RX);
      if (before) {
        m = before;
        secs = parseRestSeconds(before[0]);
      }
    }
    if (!m) return { found: false, rest: null, text: t };
    return { found: true, rest: secs, text: t.replace(m[0], ' ') };
  }

  // «40 שניות עבודה, 20 מנוחה» / «30 שניות לכל תרגיל» before a colon: only the times, no exercise.
  // «לאנג׳ 10 חזרות מנוחה 30 שניות» has a name left over, so it is the exercise itself.
  function isIntervalPrefix(s) {
    var t = String(s || '');
    if (!WORK_RX.test(t) && !REST_RX.test(t) && !new RegExp(TIME_UNIT).test(t)) return false;
    t = splitRest(t).text.replace(WORK_RX, ' ').replace(new RegExp(TIMED, 'g'), ' ')
      .replace(/(?:^|\s)(?:ל?כל|בין|ה?תרגיל(?:ים)?|ה?סבבים?|ה?סטים?|עבודה|מנוחה|הפסקה|ו)(?=[\s,\/]|$)/g, ' ');
    return !/[א-תa-zA-Z]/.test(t);
  }

  // Cues a trainer writes after the name. They go to the notes so the name
  // still matches its clip («לאנג׳ לכל רגל» found nothing in the catalog).
  // `open` marks a prescription that is not a rep count (to failure, distance).
  // A bare «לצד» is a direction («פלאנק מצד לצד», «הרמת רגל לצד»), only «לרגל» is per side.
  var PER_SIDE_RX = /(?:^|\s)(?:[לב]?כל\s+(צד|רגל|יד|זרוע|כיוון)|ל(רגל))(?=[\s,.]|$)/;
  var FAILURE_RX = /(?:^|\s)(?:עד\s+(?:ה)?כשל|מקס(?:ימום)?\s+חזרות|כמה\s+שיותר\s+חזרות)(?=[\s,.]|$)/;
  var DISTANCE_RX = /(?:^|\s|(?<=[x×]))(\d+)\s*(?:מטרים|מטר|מ[׳'])(?![\u0590-\u05FF])/;

  // A cue after a spaced dash: «סקוואט 15 - ירידה איטית», «שכיבות סמיכה 3x12 – מרפקים צמודים».
  // Only a digit-free tail that is not itself the prescription («פלאנק - דקה», «סקוואט - 15 חזרות»);
  // a hyphen inside a word («פשיטת-ברך») has no spaces around it.
  var DASH_CUE_RX = /\s[\-–—]\s+([^\d\-–—]*[\u0590-\u05FFa-zA-Z][^\d\-–—]*)$/;
  var PRESCRIPTION_WORD_RX = /דק|שני|שנ[׳']|חזרות|פעמים|סטים?|סבבים?|חצי|מנוחה|הפסקה/;
  // «סקוואט 10-12», «פלאנק 30-45 שניות», «10 עד 12 חזרות»: a range, not a name part (not a clock «1:00-1:30»).
  var RANGE_RX = /(?<![\d:.])(\d+)\s*(?:[\-–—]|עד)\s*(\d+)(?![\d:.])(?:\s*(חזרות|פעמים|שניות|שנ[׳']|דקות|סטים|סבבים)(?![\u0590-\u05FF]))?/;
  var CLOCK_RANGE_RX = /(?<!\d)(\d{1,2}:[0-5]\d)\s*(?:[\-–—]|עד)\s*(\d{1,2}:[0-5]\d)(?!\d)/;
  // «15 בכל סט», «12 לסט»: the count is per set anyway, the words are filler.
  var PER_SET_RX = /(?:^|\s)(?:ב?כל|ל)\s*(?:סט|סבב)(?=[\s,.]|$)/g;

  function splitCues(s) {
    var t = String(s || '');
    var notes = [];
    var open = false;
    t = t.replace(/\(([^()]*)\)/g, function (all, inner) {
      if (/\d/.test(inner)) return ' ' + inner + ' ';
      if (inner.trim()) notes.push(inner.trim());
      return ' ';
    });
    // The lower bound is the count, the range stays in the notes
    // (was the name «סקוואט 10 12» with 10 invented reps).
    var m = t.match(CLOCK_RANGE_RX);
    if (m) {
      notes.push(m[1] + '-' + m[2]);
      t = t.replace(m[0], ' ' + m[1] + ' ');
    } else if ((m = t.match(RANGE_RX)) && toInt(m[2]) > toInt(m[1])) {
      var unit = m[3] ? ' ' + m[3] : '';
      notes.push(m[1] + '-' + m[2] + unit);
      t = t.replace(m[0], ' ' + m[1] + unit + ' ');
    }
    m = t.match(PER_SIDE_RX);
    if (m) {
      notes.push('לכל ' + (m[1] || m[2]));
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(FAILURE_RX))) {
      notes.push('עד כשל');
      open = true;
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(DISTANCE_RX))) {
      notes.push(m[1] + ' מטר');
      open = true;
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(DASH_CUE_RX)) && /[\u0590-\u05FFa-zA-Z]/.test(t.slice(0, m.index)) && !PRESCRIPTION_WORD_RX.test(m[1])) {
      notes.push(m[1].trim());
      t = t.slice(0, m.index) + ' ';
    }
    t = t.replace(PER_SET_RX, ' ').replace(/\s[\-–—,]+\s*$/, ' ');
    return { text: t, notes: notes, open: open };
  }

  function isRestToken(s) {
    var t = Infer.fold(s);
    if (!t || !REST_RX.test(t)) return false;
    return !/[\u0590-\u05FFa-zA-Z]/.test(splitRest(t).text);
  }

  function parseRestSeconds(s) {
    var t = Infer.fold(s);
    if (!REST_RX.test(t)) return null;
    var clock = t.match(/(\d{1,2}):([0-5]\d)/);
    if (clock) return toInt(clock[1]) * 60 + toInt(clock[2]);
    if (/דקה\s*וחצי/.test(t)) return 90;
    if (/חצי\s*דקה/.test(t)) return 30;
    if (/שתי\s*דקות/.test(t)) return 120;
    var m = t.match(/(\d+)\s*דקות?/);
    if (m) return toInt(m[1]) * 60;
    if (/דקה/.test(t)) return 60;
    m = t.match(/(\d+)\s*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/);
    if (m) return toInt(m[1]);
    m = t.match(/(?:מנוחה|הפסקה)\s*[:\-–]?\s*(\d+)/);
    if (m) return toInt(m[1]);
    // «20 מנוחה», «45 הפסקה» with no unit is seconds, as «מנוחה 20» is (was the default 60).
    m = t.match(/(?:^|\s)(\d+)\s*(?:מנוחה|הפסקה)/);
    if (m) return toInt(m[1]);
    return null;
  }

  // A line that only says how many times to go through the list - «X3», «×3», «3 פעמים»,
  // «לחזור 3 פעמים», «הכל x3», «פעמיים» - is the paste's rounds, as «3 סבבים» is, not an exercise.
  var REPEAT_WORD = '(?:[לת]?(?:חזור|בצע|עשות)ו?|את|על|ה?כל|ה?סבב|ה?רשימה|ה?תרגילים|ה?אימון|זה|פעמים|סבבים?)';
  var REPEAT_LINE_RX = new RegExp('^(?:' + REPEAT_WORD + '\\s+)*(?:[x×]\\s*(\\d+)|(\\d+)\\s*[x×]|(\\d+)\\s*(?:פעמים|סבבים?)|(פעמיים))(?:\\s+' + REPEAT_WORD + ')*$', 'i');

  function repeatLineCount(line) {
    var t = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/[.:!]+\s*$/, '').replace(/\s+/g, ' ').trim();
    var m = t.match(REPEAT_LINE_RX);
    if (!m) return null;
    return m[4] ? 2 : toInt(m[1] || m[2] || m[3]);
  }

  function scanDefaults(text) {
    var raw = String(text || '');
    var defaults = { sets: null, rest: null, workSeconds: null };
    var rounds = raw.match(/(\d+)\s*סבבים?/);
    if (rounds) defaults.sets = toInt(rounds[1]);
    raw.split('\n').forEach(function (line) {
      var n = repeatLineCount(line);
      if (n && defaults.sets == null) defaults.sets = n;
    });
    // "שנ" alone is seconds, but not the start of a word like "שני" (e.g. "12 שני הצדדים").
    // [ \t] keeps a rest/work keyword on its own line from borrowing the next line's number.
    var rest = raw.match(/(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/) ||
      raw.match(/(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))[ \t]*(?:מנוחה|הפסקה)/) ||
      // «מנוחה: 20» with no unit is seconds, as «מנוחה 20» is on an exercise line.
      raw.match(/(?:מנוחה|הפסקה)[ \t]*:[ \t]*(\d+)(?![\d:.]|[ \t]*(?:דק|ד[׳']))/);
    if (rest) defaults.rest = toInt(rest[1]);
    var restClock = !rest && raw.match(/(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*(\d{1,2}):([0-5]\d)/);
    if (restClock) defaults.rest = toInt(restClock[1]) * 60 + toInt(restClock[2]);
    if (/דקה[ \t]*(?:מנוחה|הפסקה)|(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*דקה/.test(raw) && defaults.rest == null) defaults.rest = 60;
    if (/(?:שתי|2)[ \t]*דקות[ \t]*(?:מנוחה|הפסקה)|(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*(?:שתי|2)[ \t]*דקות/.test(raw) && defaults.rest == null) {
      defaults.rest = 120;
    }
    var work = raw.match(/(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))[ \t]*עבודה/) ||
      raw.match(/עבודה[ \t]*[:\-–]?[ \t]*(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/) ||
      raw.match(/עבודה[ \t]*:[ \t]*(\d+)(?![\d:.]|[ \t]*(?:דק|ד[׳']))/);
    if (work) defaults.workSeconds = toInt(work[1]);
    var perExercise = !work && raw.match(PER_EXERCISE_WORK_RX);
    if (perExercise) defaults.workSeconds = timedSeconds(perExercise[1] || perExercise[2]);
    return defaults;
  }

  // Clip names that hold a «ו» join («כתפיים וגב», «שכיבות סמיכה ורגליים») are one
  // exercise: their «ו» is masked so the «ו» split below does not cut them in two.
  var VAV_MASK = '\uE000';

  function vavNameRxs(list) {
    var rxs = [];
    (list || []).forEach(function (e) {
      var he = e && Infer.fold(e.he);
      if (!he || !/\sו\S/.test(he) || /\d/.test(he)) return;
      var body = he.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[שס]מיכה/g, '[שס]מיכה').replace(/ /g, '\\s+');
      rxs.push(new RegExp('(^|\\s)(ו?)(' + body + ')(?=\\s|$|\\d|[,.:;])', 'g'));
    });
    return rxs;
  }

  function maskVavNames(line, rxs) {
    rxs.forEach(function (rx) {
      line = line.replace(rx, function (m, pre, vav, name) {
        return pre + vav + name.replace(/(\s)ו/g, '$1' + VAV_MASK);
      });
    });
    return line;
  }

  // Pieces on one line: a comma, a «ו» before the next exercise, and the inline separators a
  // pasted list uses instead of a comma - «סופרמן 3x10 | פלאנק 30 שניות», «;», « • », «←», «->».
  var PIECE_SEP_RX = /[,،;|•·←→]|\s-+>\s|\s<-+\s|\s+ו(?!חצי|רבע)(?=\d|\s*[֐-׿])/;

  function splitTokens(text, list) {
    var vavRxs = vavNameRxs(list);
    var raw = String(text || '').trim();
    if (!raw) return [];
    var body = raw;
    var after = raw.match(/סבבים?\s*[:\-–]\s*([\s\S]+)/);
    if (after) {
      body = after[1];
    } else {
      after = raw.match(/(?:^|\n)\s*\d+\s*סבבים?\s*(?:\n+|[,،]\s*)([\s\S]+)/);
      if (after) {
        body = after[1];
      } else {
        // Only a colon on the first line: «דגש: גב ישר» on line 3 is not a title over the lines above it.
        var colon = raw.split('\n')[0].indexOf(':');
        if (colon > 0 && colon < 80) {
          var left = raw.slice(0, colon).trim();
          var right = raw.slice(colon + 1).trim();
          // «אימון רגליים: סקוואט 15» is a title; «פלאנק: 30 שניות» is the exercise itself.
          if (right && ((/^[^\d\n]{2,40}$/.test(left) && !/^[*_~\s]*[\d×xX]/.test(right)) || isIntervalPrefix(left))) {
            body = right;
          }
        }
      }
    }
    var tokens = [];
    var pendingName = null;
    body.split(/\n+/).forEach(function (line) {
      var first = tokens.length;
      var held = pendingName;
      pendingName = null;
      if (repeatLineCount(line) != null) return;
      var stripped = stripSectionLabel(line);
      if (!stripped) {
        // «פלאנק:» with its «30 שניות» on the next line: the name waits for that line.
        var label = line.replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/[.:\s]+$/, '').replace(/\s+/g, ' ').trim();
        if (/:\s*$/.test(line.replace(/[*#_~]/g, '')) && label.length > 1 && !SECTION_RX.test(label) && !TITLE_RX.test(label)) pendingName = label;
        return;
      }
      line = stripped;
      if (held) {
        var head = parseExerciseToken(line.split(PIECE_SEP_RX)[0], {});
        if (!head || head.continuation) line = held + ' ' + line;
      }
      // A title line inside the paste («אימון כוח», «תוכנית שבועית») unless it is a clip.
      if (!/\d/.test(line) && TITLE_RX.test(line.replace(/[*#_~]/g, ' ').trim()) && !matchName(line.replace(/[*#_~]/g, ' ').trim(), list || [])) return;
      maskVavNames(line, vavRxs)
        .split(PIECE_SEP_RX)
        .map(function (s) { return s.split(VAV_MASK).join('ו').replace(/^[•\-*]\s*/, '').replace(/[.:]+$/, '').trim(); })
        .filter(function (s) {
          if (s.length <= 1) return false;
          if (/^\d+\s*סבבים?$/.test(s)) return false;
          return true;
        })
        .forEach(function (s) {
          // «פלאנק 30 שניות, ירידה איטית»: the cue rides on the exercise before it as a
          // parenthetical (splitCues makes it a note) instead of becoming an exercise.
          if (tokens.length > first && isCuePiece(s)) tokens[tokens.length - 1] += ' (' + s.replace(/[()]/g, ' ').trim() + ')';
          else tokens.push(s);
        });
    });
    return tokens;
  }

  // Section headers inside a paste: «עיקרי:», «קירור», «סבב 2», «חלק ב׳» are not exercises.
  // A digit-free line ending in a colon is a header too («תרגילי בטן:»). A header word as a
  // label («עיקרי: סופרמן 3x10») is dropped and the exercise after it is kept.
  var SECTION_RX = /^(?:(?:ה?חלק|סבב|סט|שלב|תחנה|בלוק|מחזור)(?:\s+(?:\d+|[א-י][׳']?|ה?(?:ראשון|שני|שלישי|רביעי|אחרון|עיקרי)))?|(?:ה?חלק\s+)?ה?(?:עיקרי|סיום|שחרור|קירור|פתיחה|הכנה)|גוף\s+האימון)$/;
  var LABEL_RX = /^([^\d:]{2,30}?)\s*:\s*(?=[^\d\s])/;
  var TITLE_RX = /^(?:ה?(?:אימון|תוכנית|תכנית|שיעור)\s|ה?(?:חימום|מתיחות)$|תרגילי\s)/;

  function stripSectionLabel(line) {
    var t = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!/\d/.test(t) && /:$/.test(t)) return '';
    if (SECTION_RX.test(t.replace(/[.:]+$/, '').trim())) return '';
    var m = t.match(LABEL_RX);
    if (m && (SECTION_RX.test(m[1].trim()) || /^(?:ה?חימום|מתיחות|תרגילי\s|אימון\s)/.test(m[1].trim()))) {
      return line.slice(line.indexOf(':') + 1);
    }
    return line;
  }

  // A comma piece that is a coaching cue, not an exercise: tempo («לאט», «ירידה איטית»,
  // «בשליטה»), form («גב ישר», «מרפקים צמודים»), an instruction («דגש על...», «בלי לנעול»).
  // A body part counts only with its posture: «כתפיים וגב», «פלאנק ברכיים» are clips.
  var CUE_PIECE_RX = /^(?:לאט|איטי(?:ת|ים|ות)?|מהיר(?:ה|ים|ות)?|בשליטה|מבוקר(?:ת|ים|ות)?|בקצב\s+\S+|ב?(?:ירידה|עלייה|עליה)\s+(?:איטית|מהירה|מבוקרת|מתפרצת|בשליטה)|עצירה|החזקה\s+(?:למעלה|למטה|בסוף|בתחתית)|(?:גב|מרפקים|ברכיים|כתפיים|בטן|ראש|מבט|ידיים|רגליים|עקבים|אגן|חזה|גוף)\s+(?:ישר(?:ה|ים|ות)?|צמוד(?:ה|ים|ות)?|כפופ(?:ה|ים|ות)|נעול(?:ה|ים|ות)|פתוח(?:ה|ים|ות)|אסופ(?:ה|ים)|מכווצ(?:ת|ים)|מתוח(?:ה|ים|ות)|פנימה|החוצה|קדימה|אחורה|למעלה|למטה|לפנים|ניטרלי(?:ת)?|בקו)|דגש|להקפיד|הקפדה|לשמור|בלי|ללא|לא\s+ל\S+|לנשום|נשימה|טווח\s+(?:מלא|חלקי|תנועה))(?=\s|$)/;

  function isCuePiece(s) {
    var t = String(s || '').trim();
    return !/\d/.test(t) && !REST_RX.test(t) && CUE_PIECE_RX.test(t);
  }

  // Work time written in words: "שתי דקות ריצה במקום", "פלאנק שלוש דקות".
  var MINUTE_WORDS = { 'שתי': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10 };
  var MINUTE_WORDS_RE = /(^|\s)(שתי|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s+דקות(?=\s|$)/;

  function parseExerciseToken(token, defaults) {
    defaults = defaults || {};
    // WhatsApp/markdown pastes: "4*10" is a multiplier, "*סופרמן*" is only bold.
    var s = String(token || '').replace(/(\d)\s*\*\s*(?=\d)/g, '$1×').replace(/\*+/g, ' ').trim();
    if (!s) return null;
    if (isRestToken(s)) {
      return { restOnly: true, rest_seconds: parseRestSeconds(s) || defaults.rest || 60 };
    }
    // List numbering: "1. סקוואט 15", "2) שכיבות", "תרגיל 3: פלאנק" (not "3.5 דקות", not "1:30").
    s = s.replace(/^(?:תרגיל\s*\d{1,2}\s*[.)\]:\-–]?\s*|\d{1,2}\s*[.)\]](?:\s+|(?=[\u0590-\u05FFa-zA-Z]))|\d{1,2}\s*:\s*(?=[\u0590-\u05FFa-zA-Z]))/, '').trim();
    if (!s) return null;
    var sets = defaults.sets != null ? defaults.sets : null;
    var setsExplicit = false;
    var reps = null;
    var duration_seconds = defaults.workSeconds != null ? defaults.workSeconds : null;
    var rest_seconds = defaults.rest != null ? defaults.rest : null;

    // "לאנג׳ 10 חזרות מנוחה 30 שניות": the rest belongs to this exercise, the line is not a rest line.
    var restClause = splitRest(s);
    if (restClause.found) {
      s = restClause.text;
      if (restClause.rest != null) rest_seconds = restClause.rest;
    }
    // «עבודה 40 שניות מנוחה 20 שניות», «40 שניות עבודה / 20 שניות מנוחה»: the paste's interval
    // line (scanDefaults gives its times to every exercise), not an exercise called «עבודה».
    if (WORK_RX.test(s) && !/[\u0590-\u05FFa-zA-Z]/.test(s.replace(WORK_RX, ' '))) return null;
    // \u00AB40 \u05E9\u05E0\u05D9\u05D5\u05EA \u05DB\u05DC \u05EA\u05E8\u05D2\u05D9\u05DC\u00BB on its own line is that interval line too, not an exercise \u00AB\u05DB\u05DC \u05EA\u05E8\u05D2\u05D9\u05DC\u00BB.
    var perExerciseLeft = s.replace(PER_EXERCISE_WORK_RX, ' ');
    if (perExerciseLeft !== s && (!/[֐-׿a-zA-Z]/.test(perExerciseLeft) || isIntervalPrefix(perExerciseLeft))) return null;
    // Coaching cues are notes, not part of the name: "לאנג׳ 10 חזרות לכל רגל",
    // "שכיבות סמיכה עד כשל", "ספרינט 20 מטר x5", "סקוואט 15 (לאט)".
    var cues = splitCues(s);
    s = cues.text;

    // Clock time "1:30" / "3x0:40" and seconds marked with " or ״ ("30"", "45״").
    var m = s.match(/(?:(\d+)\s*[x×]\s*)?(\d{1,2}):([0-5]\d)/i);
    if (m) {
      if (m[1]) sets = toInt(m[1]);
      duration_seconds = toInt(m[2]) * 60 + toInt(m[3]);
      s = s.replace(m[0], ' ');
    } else if ((m = s.match(/(\d+)\s*["״]/))) {
      duration_seconds = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // "3 סטים של 12 חזרות", "10 חזרות 3 סבבים"; the count after the sets is reps
    // only when no time unit follows it ("3 סטים 15 שניות" is timed work).
    m = s.match(/(\d+)\s*(?:סטים?|סבבים?)\s*(?:של\s*)?(?:(\d+)(?![\d:]|\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|דק|["״′″]))(?:\s*(?:חזרות|פעמים))?)?/);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[2]) reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    // "3x12", "3 x 15 חזרות", "3x45 שניות" (sets × seconds).
    m = s.match(/(\d+)\s*[x×]\s*(\d+)(?![\d:])\s*(חזרות|פעמים|שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|["״′″])?/i);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[3] && m[3] !== 'חזרות' && m[3] !== 'פעמים') duration_seconds = toInt(m[2]);
      else reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*(?:חזרות|פעמים(?![\u0590-\u05FF]))/);
    if (m) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // A bare multiplier is the sets: "פלאנק 45 שניות x3", "x3 12 חזרות",
    // "3 סטים x 12" (reps), "סקוואט 15 x 3 סטים" (the x dangles once the sets are taken).
    var loneX = null;
    m = s.match(/(?:^|\s)[x×]\s*(\d+)(?![\d:]|\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|דק|חזרות|פעמים|["״′″]))/i);
    if (m) {
      if (!setsExplicit) {
        sets = toInt(m[1]);
        setsExplicit = true;
        loneX = sets;
      } else if (reps == null) {
        reps = toInt(m[1]);
      }
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+)\s*[x×](?=\s|$)/i);
    if (m) {
      if (!setsExplicit) {
        sets = toInt(m[1]);
        setsExplicit = true;
        loneX = sets;
      } else if (reps == null && duration_seconds == null) {
        reps = toInt(m[1]);
      }
      s = s.replace(m[0], ' ');
    }
    var minMatch = null;
    var minSec = null;
    m = s.match(/(?:(\d+)\s*דקות|שתי\s*דקות|דקה)\s*(?:וחצי|ו-?(?:1\/2|½))/);
    if (m) {
      if (m[1]) minSec = toInt(m[1]) * 60 + 30;
      else if (/שתי/.test(m[0])) minSec = 150;
      else minSec = 90;
      minMatch = m[0];
    } else if ((m = s.match(/(?:1\/2|½|חצי)\s*דקה/))) {
      minSec = 30;
      minMatch = m[0];
    } else if ((m = s.match(/שתי\s*דקות/))) {
      minSec = 120;
      minMatch = m[0];
    } else if ((m = s.match(/(\d+(?:\.\d+)?)\s*(?:דקות|דקה|דק[׳']|′)/))) {
      minSec = Math.round(parseFloat(m[1]) * 60);
      minMatch = m[0];
    } else if ((m = s.match(/(^|\s)דקתיים(?=\s|$)/))) {
      minSec = 120;
      minMatch = m[0];
    } else if ((m = s.match(MINUTE_WORDS_RE))) {
      minSec = MINUTE_WORDS[m[2]] * 60;
      minMatch = m[0];
    } else if ((m = s.match(/(?:^|[\s\-–—,.:])(דקה(?:\s*אחת)?)(?:[\s\-–—,.:]|$)/))) {
      minSec = 60;
      minMatch = m[0];
    }
    if (minMatch) {
      duration_seconds = minSec;
      s = s.replace(minMatch, ' ');
    }
    m = s.match(/(\d+)\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|″)/);
    if (m) {
      var sec = toInt(m[1]);
      duration_seconds = minSec != null ? minSec + sec : sec;
      s = s.replace(m[0], ' ');
    } else {
      m = s.match(/(\d+)\s*(?:דקות|דקה|דק[׳'])/);
      if (m) {
        duration_seconds = toInt(m[1]) * 60;
        s = s.replace(m[0], ' ');
      } else if ((m = s.match(/דקה וחצי/))) {
        duration_seconds = 90;
        s = s.replace(m[0], ' ');
      } else if ((m = s.match(/חצי דקה/))) {
        duration_seconds = 30;
        s = s.replace(m[0], ' ');
      } else if ((m = s.match(/(^|\s)דקה(?=\s|$)/))) {
        duration_seconds = 60;
        s = s.replace(m[0], ' ');
      }
    }
    s = s.trim();
    m = s.match(/^(\d+)\s+/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // A count after the name: "שכיבות סמיכה 15".
    m = s.match(/\s(\d+)\s*$/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // «סופרמן x15» / «סופרמן 15x» with no other count is 15 reps, not 15 sets of an invented 10
    // (and under «3 סבבים:» the rounds stay 3).
    if (loneX != null && reps == null && duration_seconds == null && !cues.open) {
      reps = loneX;
      sets = defaults.sets != null ? defaults.sets : null;
      setsExplicit = false;
    }

    // «סופרמן 3 סטים / 12 חזרות»: the slash only divided the counts, it is not part of the name.
    var name =s.replace(/^[\s\/]+|[\s\/]+$/g, '').replace(/[\-–—,.:×xX]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) {
      // "מתח 5 חזרות, 4 סטים": the comma split the sets off; hand them to the exercise before.
      if (setsExplicit || (restClause.found && restClause.rest != null)) {
        var cont = { continuation: true, sets: setsExplicit ? sets : null, rest_seconds: restClause.found ? restClause.rest : null };
        // «מתח 5 חזרות, 4 סטים, לאט»: the cue joined the sets piece; it still belongs to the exercise.
        if (cues.notes.length) cont.notes = cues.notes.join(' · ');
        return cont;
      }
      return null;
    }
    if (/^\d+$/.test(name)) return null;
    if (sets == null) sets = defaults.sets != null ? defaults.sets : 1;
    if (reps == null && duration_seconds == null) {
      duration_seconds = defaults.workSeconds || null;
      // "עד כשל" / "20 מטר" is the prescription; an invented 10 reps would contradict it.
      if (duration_seconds == null && !cues.open) reps = 10;
    }
    return {
      name: name,
      sets: sets,
      reps: reps,
      duration_seconds: duration_seconds,
      rest_seconds: rest_seconds,
      notes: cues.notes.length ? cues.notes.join(' · ') : null,
      restOnly: undefined
    };
  }

  function tokenOverlap(a, b) {
    var ta = Infer.normalizeSynonym(a).split(' ').filter(function (w) { return w.length >= 2; });
    var tb = Infer.normalizeSynonym(b).split(' ').filter(function (w) { return w.length >= 2; });
    if (!ta.length || !tb.length) return 0;
    var hit = 0;
    ta.forEach(function (w) {
      if (tb.indexOf(w) !== -1) hit++;
    });
    return hit / Math.max(ta.length, tb.length);
  }

  function matchName(name, list) {
    if (!name) return null;
    var api = th();
    if (api && typeof api.matchCatalog === 'function' && api.catalog && Object.keys(api.catalog).length) {
      var hit = api.matchCatalog(name);
      if (hit) return hit;
    }
    var n = Infer.normalizeSynonym(name);
    var best = null;
    var bestScore = 0;
    (list || []).forEach(function (e) {
      if (!e || !e.he) return;
      var he = Infer.normalizeSynonym(e.he);
      var score = 0;
      if (he === n) score = 10;
      else if (he.length >= 3 && (n.indexOf(he) !== -1 || he.indexOf(n) !== -1)) score = 6 + Math.min(he.length, n.length) / 10;
      else score = tokenOverlap(name, e.he) * 5;
      if (e.driveId) score += 0.2;
      if (score > bestScore && score >= 4) {
        best = e;
        bestScore = score;
      }
    });
    return best;
  }

  function catalogEntries() {
    var api = th();
    if (api && typeof api.catalogList === 'function') return api.catalogList();
    return [];
  }

  function wishlistList() {
    var api = th();
    if (!api) return [];
    var list = api.store.get(api.KEYS.wishlist, []);
    return Array.isArray(list) ? list : [];
  }

  function wishlistAdd(name, reason) {
    var api = th();
    if (!api || !name) return wishlistList();
    var list = wishlistList();
    var key = Infer.normalizeSynonym(name);
    for (var i = 0; i < list.length; i++) {
      if (Infer.normalizeSynonym(list[i].he) === key) return list;
    }
    list.push({
      he: name,
      reason: reason || 'חסר סרטון במאגר',
      at: new Date().toISOString()
    });
    api.store.set(api.KEYS.wishlist, list);
    return list;
  }

  function wishlistRemove(name) {
    var api = th();
    if (!api) return [];
    var key = Infer.normalizeSynonym(name);
    var list = wishlistList().filter(function (item) {
      return !item || Infer.normalizeSynonym(item.he) !== key;
    });
    api.store.set(api.KEYS.wishlist, list);
    return list;
  }

  // A wish is "film this exercise". Once a clip that matches the name exists
  // (the trainer added it in manage.html, or it arrived in the catalog), the
  // wish is done: drop it, using the same matcher that failed when the wish
  // was written, so the list only shows names a paste would still miss.
  function wishlistPrune(catalogOrList) {
    var api = th();
    if (!api) return [];
    var list = Array.isArray(catalogOrList) ? catalogOrList : catalogEntries();
    var before = wishlistList();
    var kept = before.filter(function (item) {
      return item && item.he && !matchName(item.he, list);
    });
    if (kept.length !== before.length) api.store.set(api.KEYS.wishlist, kept);
    return kept;
  }

  function learnFromWorkout(workout) {
    var api = th();
    if (!api || !workout) return;
    var ids = [];
    (workout.phases || []).forEach(function (ph) {
      (ph.exercises || []).forEach(function (ex) {
        if (ex && ex.id) ids.push(ex.id);
      });
    });
    if (ids.length < 2) return;
    var store = api.store.get(api.KEYS.patterns, { follows: {}, n: 0 });
    if (!store || typeof store !== 'object') store = { follows: {}, n: 0 };
    if (!store.follows) store.follows = {};
    for (var i = 0; i < ids.length - 1; i++) {
      var key = ids[i] + '>' + ids[i + 1];
      store.follows[key] = (store.follows[key] || 0) + 1;
    }
    store.n = (store.n || 0) + 1;
    api.store.set(api.KEYS.patterns, store);
  }

  function patternScore(prevId, nextId) {
    var api = th();
    if (!api || !prevId || !nextId) return 0;
    var store = api.store.get(api.KEYS.patterns, { follows: {} });
    if (!store || !store.follows) return 0;
    return store.follows[prevId + '>' + nextId] || 0;
  }

  // WhatsApp pastes: «סופרמן 3x10 💪», «✅ פלאנק 30 שניות», «1️⃣ סקוואט 15». The emoji is
  // decoration; left in, it stays in the name and the clip is not found.
  var KEYCAP_RX = /[0-9#*]\uFE0F?\u20E3/g;
  var EMOJI_RX = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[\uFE0F\u200D]/gu;

  function stripEmoji(text) {
    return String(text || '').replace(KEYCAP_RX, ' ').replace(EMOJI_RX, ' ');
  }

  function ingestText(text, catalogOrList) {
    var raw = stripEmoji(text).trim();
    var defaults = scanDefaults(raw);
    var list = Array.isArray(catalogOrList)
      ? catalogOrList
      : (catalogOrList && typeof catalogOrList === 'object'
        ? Object.keys(catalogOrList).filter(function (k) { return k.charAt(0) !== '_'; })
          .map(function (id) { return Object.assign({ id: id }, catalogOrList[id]); })
        : catalogEntries());
    var tokens = splitTokens(raw, list);

    var exercises = [];
    var unmatched = [];
    var lastRest = defaults.rest;
    for (var i = 0; i < tokens.length; i++) {
      var parsed = parseExerciseToken(tokens[i], defaults);
      if (!parsed) continue;
      if (parsed.restOnly) {
        lastRest = parsed.rest_seconds;
        if (exercises.length) exercises[exercises.length - 1].rest_seconds = lastRest;
        continue;
      }
      if (parsed.continuation) {
        var prev = exercises[exercises.length - 1];
        if (parsed.sets != null) {
          if (prev) prev.sets = parsed.sets;
          else defaults.sets = parsed.sets;
        }
        if (parsed.rest_seconds != null) {
          lastRest = parsed.rest_seconds;
          if (prev) prev.rest_seconds = lastRest;
        }
        if (parsed.notes && prev) prev.notes = [prev.notes, parsed.notes].filter(Boolean).join(' · ');
        continue;
      }
      if (lastRest != null && parsed.rest_seconds == null) parsed.rest_seconds = lastRest;
      var hit = matchName(parsed.name, list);
      if (hit) {
        parsed.id = hit.id;
        parsed.matchedHe = hit.he;
        parsed.missing = false;
        parsed.source = hit.source || (hit.driveId ? 'drive' : hit.file ? 'local' : '');
      } else {
        parsed.missing = true;
        parsed.id = null;
        unmatched.push(parsed.name);
        wishlistAdd(parsed.name, 'נקלט מאימון מודבק בלי סרטון במאגר');
      }
      exercises.push(parsed);
    }

    var workout = {
      title: 'אימון שנקלט',
      duration_minutes: null,
      participants: 1,
      equipment: [],
      intensity: 'medium',
      tags: ['ingest'],
      phases: [
        { name: 'Warm-up', duration_minutes: 0, exercises: [] },
        { name: 'Main', duration_minutes: null, exercises: exercises.map(function (ex) {
          return {
            name: ex.name,
            id: ex.id,
            sets: ex.sets,
            reps: ex.reps,
            duration_seconds: ex.duration_seconds,
            rest_seconds: ex.rest_seconds,
            notes: [ex.notes, ex.missing ? 'חסר סרטון' : null].filter(Boolean).join(' · ') || null,
            missing: ex.missing || false
          };
        }) },
        { name: 'Cool-down', duration_minutes: 0, exercises: [] }
      ],
      source: 'ingest'
    };

    if (Analyzer && typeof Analyzer.analyzeSession === 'function') {
      workout.analysis = Analyzer.analyzeSession(workout);
    }
    learnFromWorkout(workout);
    return {
      workout: workout,
      exercises: exercises,
      unmatched: unmatched,
      wishlist: wishlistList(),
      defaults: defaults
    };
  }

  function saveSegment(opts) {
    opts = opts || {};
    var api = th();
    var driveId = opts.driveId || (opts.url && Infer.parseDriveId(opts.url));
    var he = String(opts.he || opts.name || '').trim();
    var startSec = Number(opts.startSec);
    var endSec = Number(opts.endSec);
    if (!api) return { error: 'no-core', message: 'ליבת המאגר לא טעונה.' };
    if (Infer.isBlockedName(he)) {
      return { error: 'blocked', message: 'השם חסום — קליפים אנונימיים או שמות אישיים לא נכנסים למאגר.' };
    }
    if (!driveId) return { error: 'need-drive', message: 'צריך מזהה דרייב של הסרטון הארוך.' };
    if (!he) return { error: 'need-name', message: 'צריך שם תרגיל בעברית למקטע.' };
    if (!isFinite(startSec) || !isFinite(endSec) || endSec <= startSec) {
      return { error: 'bad-range', message: 'סמנו התחלה וסוף — זמן הסיום חייב להיות אחרי ההתחלה.' };
    }
    var inferred = Infer.inferFromName(he, { folder: opts.folder || '' });
    // Re-saving the same slice (same video, same start and end) updates it.
    // Any other slice gets an id no catalog or user entry already holds, so a
    // second "פלאנק" segment becomes seg_פלאנק_2 instead of replacing the first.
    var start = Math.floor(startSec);
    var end = Math.floor(endSec);
    var users = typeof api.userCatalogList === 'function' ? api.userCatalogList() : [];
    var same = users.filter(function (e) {
      return e && e.driveId === driveId && e.startSec != null &&
        Number(e.startSec) === start && Number(e.endSec) === end;
    })[0];
    var used = {};
    Object.keys(api.catalog || {}).forEach(function (k) { used[k] = true; });
    users.forEach(function (e) { if (e && e.id) used[e.id] = true; });
    var entry = {
      id: same ? same.id : Infer.makeId('seg', he, used),
      he: he,
      muscles: inferred.muscles,
      equipment: inferred.equipment,
      level: inferred.level,
      source: 'drive',
      folder: opts.folder || '',
      driveId: driveId,
      startSec: start,
      endSec: end,
      segmentOf: opts.segmentOf || driveId
    };
    if (!api.addUserEntry(entry)) {
      return { error: 'storage', message: 'המקטע לא נשמר: הדפדפן חוסם שמירה מקומית (למשל גלישה פרטית).' };
    }
    return { entry: entry };
  }

  var api = {
    ingestText: ingestText,
    parseExerciseToken: parseExerciseToken,
    scanDefaults: scanDefaults,
    matchName: matchName,
    wishlistList: wishlistList,
    wishlistAdd: wishlistAdd,
    wishlistRemove: wishlistRemove,
    wishlistPrune: wishlistPrune,
    learnFromWorkout: learnFromWorkout,
    patternScore: patternScore,
    saveSegment: saveSegment,
    isRestToken: isRestToken
  };

  root.THIngest = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
