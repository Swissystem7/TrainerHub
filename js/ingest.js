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
  var MINUTE_UNIT = '(?:דקות|דקה|דק(?:[׳\'′]|(?![\\u0590-\\u05FF])))';
  var TIME_UNIT = '(?:שניות|שנייה|שניה|שנ(?:[׳\']|(?![\\u0590-\\u05FF]))|' + MINUTE_UNIT + ')';
  var HALF = '\\s*(?:וחצי|ו-?(?:1\\/2|½))';
  var TIMED = '(?:\\d{1,2}:[0-5]\\d|(?:1\\/2|½|חצי)\\s*' + MINUTE_UNIT + '|\\d+(?:\\.\\d+)?\\s*' + TIME_UNIT + '(?:' + HALF + ')?|(?:שתי\\s*דקות|דקה)\\s*וחצי|חצי\\s*דקה|שתי\\s*דקות|דקה(?:\\s+אחת)?)';
  var REST_FILLER = '(?:\\s+(?:של|פעילה|קצרה|ארוכה|בין\\s+(?:ה?סטים|ה?סבבים|ה?תרגילים|כל\\s+(?:סט|סבב|תרגיל))|(?:ל|אחרי\\s+)כל\\s+ה?(?:סט|סבב|תרגיל)))*';
  var REST_AFTER_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?:מנוחה|הפסקה)' + REST_FILLER + '(?:(?:\\s*[:\\-–]\\s*|\\s+)(?:' + TIMED + '|\\d+(?![\\d:])))?' + REST_FILLER);
  // «עבודה 40 שניות», «עבודה: 40», «40 שניות עבודה»: the work time of an interval paste.
  var WORK_RX = new RegExp('עבודה\\s*[:\\-–]?\\s*(?:' + TIMED + '|\\d+(?![\\d:]))|' + TIMED + '\\s*עבודה');
  // «סקוואט 3x12 דקה מנוחה» is 3×12 with a minute's rest (was 1×3 with 720 s): the time does not start
  // inside the count, and «12 דקה» is 12 then a minute (twelve minutes is «12 דקות»).
  var REST_BEFORE_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?<![\\d:.\\/]|[x×X*]\\s*)(?!(?:[2-9]|\\d{2,})\\s*דקה(?!ות))' + TIMED + '\\s+(?:מנוחה|הפסקה)' + REST_FILLER);
  // «ברפי 40 שניות 20 מנוחה»: a bare number before the rest word is its seconds, as «20 מנוחה» alone is.
  var BARE_REST_BEFORE_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?<![\\d:.\\/])\\d+\\s+(?:מנוחה|הפסקה)' + REST_FILLER);
  // «40 שניות עבודה 20 מנוחה», «עבודה 40 מנוחה 20», «30 שניות עבודה / 15 שניות מנוחה»: the work
  // and the rest of one interval; a bare number on either side is seconds.
  var PAIR_VALUE = '(' + TIMED + '|\\d+(?![\\d:.]))';
  var WORK_REST_RX = new RegExp('(?:עבודה\\s*[:\\-–]?\\s*' + PAIR_VALUE + '|' + PAIR_VALUE + '\\s*עבודה)\\s*[,\\/|]?\\s*' +
    '(?:ו?(?:מנוחה|הפסקה)\\s*[:\\-–]?\\s*' + PAIR_VALUE + '|(?:ו-?)?' + PAIR_VALUE + '\\s*ו?(?:מנוחה|הפסקה))');
  // «40/20», «טבאטה 20/10», «ברפי 30/15 שניות»: work/rest seconds of an interval. Only round
  // numbers from 20/10 up - «סקוואט 4/12» is sets/reps and «לאנג׳ 10/10» / «12/12» is per leg.
  var SLASH_PAIR_RX = /(?<![\d:.\/])(\d{2,3})\s*\/\s*(\d{2,3})(?![\d:.\/])(?:\s*(?:שניות|שנ(?:[׳']|(?![א-ת]))))?/;
  var INTERVAL_WORD_RX = /(?:^|\s)(?:טבאטה|tabata|hiit|אינטרוול(?:ים)?|interval(?:s)?|עבודה\s*\/\s*מנוחה)(?=[\s:,.\-–]|$)/gi;

  function slashPair(s) {
    var m = String(s || '').match(SLASH_PAIR_RX);
    if (!m) return null;
    var work = toInt(m[1]);
    var rest = toInt(m[2]);
    if (work < 20 || rest < 10 || work % 5 || rest % 5 || (work === rest && work < 30)) return null;
    return { text: m[0], work: work, rest: rest };
  }
  // «30 שניות לכל תרגיל», «כל תרגיל 45 שניות», «דקה על כל תרגיל»: the work time of every
  // exercise in the paste. Not a rest: «מנוחה 30 שניות לכל תרגיל», «מנוחה בין כל תרגיל 30 שניות».
  var PER_EXERCISE = '(?<![\\u0590-\\u05FF])(?<!בין\\s+)(?:[לב]|על\\s+)?כל\\s+ה?תרגיל(?![\\u0590-\\u05FF])';
  var PER_EXERCISE_WORK_RX = new RegExp('(?<!(?:מנוחה|הפסקה)[\\s:\\-–]*)(?<![\\d:])(' + TIMED + ')\\s*' + PER_EXERCISE + '|' +
    PER_EXERCISE + '\\s*[:\\-–]?\\s*(' + TIMED + ')(?!\\s*(?:מנוחה|הפסקה))');

  // Minutes as trainers write them: «2 דקות», «2 דק׳» («2 דק» once fold() dropped the geresh),
  // «2 דק׳ וחצי», «1/2 דקה», «½ דק׳», «1.5 דקות», «דקה וחצי». Null when there are none.
  var HALF_RX = new RegExp(HALF);
  var HALF_MINUTE_RX = new RegExp('(?:1\\/2|½|(?<!ו)חצי)\\s*' + MINUTE_UNIT);
  var MINUTES_RX = new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + MINUTE_UNIT);

  function minuteSeconds(s) {
    var t = String(s || '');
    var half = HALF_RX.test(t) ? 30 : 0;
    if (HALF_MINUTE_RX.test(t)) return 30;
    if (/שתי\s*דקות/.test(t)) return 120 + half;
    var m = t.match(MINUTES_RX);
    if (m) return Math.round(parseFloat(m[1]) * 60) + half;
    if (/דקה/.test(t)) return 60 + half;
    return null;
  }

  function timedSeconds(s) {
    var t = String(s || '');
    var clock = t.match(/(\d{1,2}):([0-5]\d)/);
    if (clock) return toInt(clock[1]) * 60 + toInt(clock[2]);
    var secs = minuteSeconds(t);
    if (secs != null) return secs;
    var m = t.match(/(\d+)/);
    return m ? toInt(m[1]) + (/וחצי/.test(t) ? 30 : 0) : null;
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
    // Only when the exercise keeps a count of its own («סקוואט 15 מנוחה» stays 15 reps)
    // - was the name «ברפי 20» with no rest.
    var bare = secs == null && t.match(BARE_REST_BEFORE_RX);
    if (bare) {
      var left = t.replace(bare[0], ' ');
      if (/\d/.test(left) || new RegExp(TIMED).test(left) || !/[א-תa-zA-Z]/.test(left)) {
        m = bare;
        secs = parseRestSeconds(bare[0]);
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
  // «לאנג׳ 12 שני הצדדים» / «לשני הצדדים» / «משני הצדדים» is the count on each side too
  // (was a clip-less name «לאנג׳ 12 שני הצדדים» with 10 invented reps).
  var BOTH_SIDES_RX = /(?:^|\s)[לבמ]?(?:שני|2)\s+(?:ה)?צדדים(?=[\s,.]|$)/;
  // A bare «מקסימום» / «מקס» / «max» is to failure too: «שכיבות סמיכה 3 סטים מקסימום» was a name
  // «שכיבות סמיכה מקסימום» with 10 invented reps, «מתח 3xמקס» a name «מתח 3 מקס» with one set.
  var FAILURE_RX = /(?:^|\s|(?<=[x×]))(?:עד\s+(?:ה)?כשל|(?:מקס(?:ימום)?|[Mm][Aa][Xx])(?:\s+(?:חזרות|זמן))?|כמה\s+שיותר\s+חזרות)(?=[\s,.]|$)/;
  var DISTANCE_RX = /(?:^|\s|(?<=[x×]))(\d+)\s*(?:מטרים|מטר|מ[׳'])(?![\u0590-\u05FF])/;
  // The load: «לחיצת חזה 4x8 80 קג», «סקוואט 3x10 עם 20 קילו», «דדליפט 5x5 100kg» (not «קילומטר»).
  var WEIGHT_RX = /(?:^|\s)(?:עם\s+)?(\d+(?:\.\d+)?)\s*(?:ק\s*["״׳']?\s*ג|קילו(?:גרם)?|kg)(?![֐-׿a-zA-Z])/i;

  // A cue after a spaced dash: «סקוואט 15 - ירידה איטית», «שכיבות סמיכה 3x12 – מרפקים צמודים».
  // Only a digit-free tail that is not itself the prescription («פלאנק - דקה», «סקוואט - 15 חזרות»);
  // a hyphen inside a word («פשיטת-ברך») has no spaces around it.
  var DASH_CUE_RX = /\s[\-–—]\s+([^\d\-–—]*[\u0590-\u05FFa-zA-Z][^\d\-–—]*)$/;
  var PRESCRIPTION_WORD_RX = /דק|שני|שנ[׳']|חזרות|פעמים|סטים?|סבבים?|חצי|מנוחה|הפסקה/;
  // «סקוואט 10-12», «פלאנק 30-45 שניות», «10 עד 12 חזרות»: a range, not a name part (not a clock «1:00-1:30»).
  var RANGE_RX = /(?<![\d:.])(\d+)\s*(?:[\-–—]|עד)\s*(\d+)(?![\d:.])(?:\s*(חזרות|פעמים|שניות|שנ[׳']|דקות|סטים|סבבים)(?![\u0590-\u05FF]))?/;
  var CLOCK_RANGE_RX = /(?<!\d)(\d{1,2}:[0-5]\d)\s*(?:[\-–—]|עד)\s*(\d{1,2}:[0-5]\d)(?!\d)/;
  var PLUS_COUNT_RX = /(?<![\d:.\/])(\d+)(\s*(?:שניות|שנ[׳']|חזרות|["״]))?\s*\+\s*(\d+)(?![\d:.\/])/;
  var SLASH_COUNT_RX = /(?<![\d:.\/])(\d+)(\s*(?:שניות|שנ[׳']|חזרות|["״]))?\s*\/\s*(\d+)(?![\d:.\/])/;
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
    // «פלאנק צד 30+30 שניות», «לאנג׳ 10+10»: the same count on each side, not a name «פלאנק צד 30+».
    // An uneven «20+10» keeps the first count and the split in the notes.
    // «לאנג׳ 10/10», «הרמת רגל 8/8» are written the same way (were a name «לאנג׳ 10/10» / 8 sets of 8);
    // only an even pair or two counts from 10 up - «סקוואט 4/12» is sets/reps and «1/2 דקה» half a minute.
    m = t.match(PLUS_COUNT_RX) || t.match(SLASH_COUNT_RX);
    if (m && m[0].indexOf('/') !== -1 && m[1] !== m[3] && (toInt(m[1]) < 10 || toInt(m[3]) < 10)) m = null;
    if (m) {
      var each = m[1] === m[3];
      if (!each) notes.push(m[1] + (m[0].indexOf('/') !== -1 ? '/' : '+') + m[3]);
      t = t.replace(m[0], ' ' + m[1] + ' ');
      if (each && !PER_SIDE_RX.test(t)) notes.push('לכל צד');
    }
    m = t.match(PER_SIDE_RX);
    if (m) {
      notes.push('לכל ' + (m[1] || m[2]));
      t = t.replace(m[0], ' ');
    }
    // Only next to a name: a bare «3 סטים 12 שני הצדדים» keeps it as the name.
    if ((m = t.match(BOTH_SIDES_RX)) && /[א-תa-zA-Z]/.test(t.replace(m[0], ' ').replace(/\d+/g, ' ')
      .replace(/(?:^|\s)(?:[x×]|סטים?|סבבים?|חזרות|פעמים|של)(?=\s|$)/g, ' '))) {
      if (notes.indexOf('לכל צד') === -1) notes.push('לכל צד');
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
    if ((m = t.match(WEIGHT_RX))) {
      notes.push(m[1] + ' ק"ג');
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
    // «מנוחה 2 דק׳» is 120 s, «מנוחה 2 דקות וחצי» 150 s, «מנוחה 1/2 דקה» 30 s
    // (were 2 s, 120 s and 1 s: the number was read as seconds and the half was dropped).
    var secs = minuteSeconds(t);
    if (secs != null) return secs;
    var m = t.match(/(\d+)\s*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/);
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

  // A count written in words - «סקוואט עשר חזרות», «פלאנק שלושים שניות», «3 סטים של עשר» - is
  // that number (was a name «סקוואט עשר חזרות» with 10 invented reps). Only before a unit word or
  // after «של»/x, so «סקוואט על רגל אחת» and «12 שני הצדדים» stay as written.
  var NUMBER_WORDS = {
    'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שנים': 2, 'שתים': 2, 'שני': 2, 'שתי': 2,
    'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5, 'שש': 6, 'שישה': 6,
    'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9
  };
  var TENS_WORDS = { 'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50, 'שישים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90 };
  var UNIT_NUM = '(' + Object.keys(NUMBER_WORDS).join('|') + ')';
  var NUMBER_PHRASE = '(?:(' + Object.keys(TENS_WORDS).join('|') + ')(?:\\s+ו' + UNIT_NUM + ')?|' +
    UNIT_NUM + '(?:\\s+(עשרה?))?|(עשרה?))';
  var COUNT_UNIT = '(?:חזרות|שניות|שנ[׳\']|דקות|סטים|סדרות|סבבים|סיבובים|פעמים|קילו)';
  var NUMBER_WORD_RX = new RegExp('(^|[^א-ת])(?:(של|[x×])\\s*)?' + NUMBER_PHRASE + '(?=(\\s+' + COUNT_UNIT + '(?![א-ת]))|(?![א-ת]))', 'g');

  function numberWordsToDigits(text) {
    return String(text || '').replace(NUMBER_WORD_RX, function (all, pre, lead, tens, tensUnit, unit, teen, ten, unitAfter) {
      if (!lead && !unitAfter) return all;
      var n = tens ? TENS_WORDS[tens] + (tensUnit ? NUMBER_WORDS[tensUnit] : 0)
        : unit ? NUMBER_WORDS[unit] + (teen ? 10 : 0) : 10;
      return pre + (lead === 'של' ? 'של ' : lead || '') + n;
    });
  }

  function scanDefaults(text) {
    var raw = numberWordsToDigits(text);
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
    // «40 שניות עבודה 20 מנוחה» / «עבודה 40 מנוחה 20»: the bare numbers are seconds (were dropped).
    var pair = null;
    raw.split('\n').some(function (line) { return (pair = line.match(WORK_REST_RX)); });
    // «40/20» / «טבאטה 20/10» on a line of its own is the interval of every exercise (was a phantom
    // exercise «40/20»); «ברפי 40/20» keeps its times to itself.
    var slash = null;
    if (!pair) {
      raw.split('\n').some(function (line) {
        var p = slashPair(line);
        var left = p && line.replace(p.text, ' ').replace(INTERVAL_WORD_RX, ' ').replace(/[x×]\s*\d+/gi, ' ');
        return p && !/[א-תa-zA-Z]/.test(left) && (slash = p);
      });
    }
    if (pair && defaults.rest == null) defaults.rest = timedSeconds(pair[3] || pair[4]);
    if (slash && defaults.rest == null) defaults.rest = slash.rest;
    var restClock = !rest && raw.match(/(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*(\d{1,2}):([0-5]\d)/);
    if (restClock) defaults.rest = toInt(restClock[1]) * 60 + toInt(restClock[2]);
    // «מנוחה דקה וחצי» / «מנוחה 2 דקות וחצי» are not a whole minute or two (the rest line itself gives 90 / 150).
    if (/דקה[ \t]*(?:מנוחה|הפסקה)|(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*דקה(?![ \t]*(?:וחצי|ו-?(?:1\/2|½)))/.test(raw) && defaults.rest == null) defaults.rest = 60;
    if (/(?:שתי|2)[ \t]*דקות[ \t]*(?:מנוחה|הפסקה)|(?:מנוחה|הפסקה)[ \t]*[:\-–]?[ \t]*(?:שתי|2)[ \t]*דקות(?![ \t]*(?:וחצי|ו-?(?:1\/2|½)))/.test(raw) && defaults.rest == null) {
      defaults.rest = 120;
    }
    var work = raw.match(/(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))[ \t]*עבודה/) ||
      raw.match(/עבודה[ \t]*[:\-–]?[ \t]*(\d+)[ \t]*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/) ||
      raw.match(/עבודה[ \t]*:[ \t]*(\d+)(?![\d:.]|[ \t]*(?:דק|ד[׳']))/);
    if (work) defaults.workSeconds = toInt(work[1]);
    else if (pair) defaults.workSeconds = timedSeconds(pair[1] || pair[2]);
    else if (slash) defaults.workSeconds = slash.work;
    var perExercise = !work && !pair && !slash && raw.match(PER_EXERCISE_WORK_RX);
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

  // «שכיבות סמיכה 20 + פלאנק 30 שניות» is two exercises: a «+» after a counted exercise and
  // before a named one splits like a comma. «סקוואט + קפיצה 10» (one combo move) and
  // «פלאנק 30+30 שניות» (no name after the «+») stay one piece.
  function splitPlus(line) {
    var parts = line.split(/(\s*\+\s*)/);
    var out = parts[0];
    for (var i = 2; i < parts.length; i += 2) {
      var left = out.split(PIECE_SEP_RX).pop();
      var right = parseExerciseToken(parts[i].split(PIECE_SEP_RX)[0], {});
      var split = /\d/.test(left) && /[א-תa-zA-Z]/.test(left) && right && !right.continuation && right.name;
      out += (split ? ', ' : parts[i - 1]) + parts[i];
    }
    return out;
  }

  function splitTokens(text, list) {
    var vavRxs = vavNameRxs(list);
    var raw = numberWordsToDigits(text).trim();
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
      line = splitPlus(line);
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
    // «סקוואט 3 על 12» is said for 3×12 (was a name «סקוואט 3 על» with one set).
    var s = numberWordsToDigits(token).replace(/(\d)\s*\*\s*(?=\d)/g, '$1×').replace(/\*+/g, ' ')
      .replace(/(^|\s)(\d+)\s+על\s+(?=\d)/g, '$1$2×').trim();
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

    // «ג׳אמפינג ג׳קס 40 שניות עבודה 20 מנוחה» is 40 s with 20 s rest (was a name «ג׳אמפינג ג׳קס עבודה 20»
    // and no rest); alone on its line it is the paste's interval line.
    var pair = s.match(WORK_REST_RX);
    if (pair) {
      duration_seconds = timedSeconds(pair[1] || pair[2]);
      rest_seconds = timedSeconds(pair[3] || pair[4]);
      s = s.replace(pair[0], ' ');
      if (!/[א-תa-zA-Z]/.test(s)) return null;
    } else if ((pair = slashPair(s))) {
      duration_seconds = pair.work;
      rest_seconds = pair.rest;
      s = s.replace(pair.text, ' ');
      if (!/[א-תa-zA-Z]/.test(s.replace(INTERVAL_WORD_RX, ' '))) return null;
    }
    // "לאנג׳ 10 חזרות מנוחה 30 שניות": the rest belongs to this exercise, the line is not a rest line.
    var restClause = splitRest(s);
    if (restClause.found) {
      s = restClause.text;
      if (restClause.rest != null) rest_seconds = restClause.rest;
    }
    // «עבודה 40 שניות מנוחה 20 שניות», «40 שניות עבודה / 20 שניות מנוחה»: the paste's interval
    // line (scanDefaults gives its times to every exercise), not an exercise called «עבודה».
    if (WORK_RX.test(s) && !/[\u0590-\u05FFa-zA-Z]/.test(s.replace(WORK_RX, ' '))) return null;
    // \u00AB\u05D1\u05E8\u05E4\u05D9 30 \u05E9\u05E0\u05D9\u05D5\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4\u00BB: the work time is the exercise's time, \u00AB\u05E2\u05D1\u05D5\u05D3\u05D4\u00BB is not part of its name.
    var work = s.match(WORK_RX);
    if (work) {
      duration_seconds = timedSeconds(work[0]);
      s = s.replace(work[0], ' ');
    }
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
    } else if ((m = s.match(/(?:(?:^|\s)([1-9])\s*\/\s*)?(\d+)\s*["״]/))) {
      // «פלאנק 3/30"» is 3 sets of 30 s.
      if (m[1]) {
        sets = toInt(m[1]);
        setsExplicit = true;
      }
      duration_seconds = toInt(m[2]);
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
    // «סקוואט 4/12» is 4 sets of 12 like «4x12»; «פלאנק 3/30 שניות» is 3 × 30 s.
    // «1/2 דקה» / «דקה ו-1/2» stay half a minute.
    m = setsExplicit ? null : s.match(/(?:^|\s)([1-9])\s*\/\s*(\d+)(?![\d:\/.]|\s*(?:דק|′))\s*(חזרות|פעמים|שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|["״″])?/);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[3] && m[3] !== 'חזרות' && m[3] !== 'פעמים') duration_seconds = toInt(m[2]);
      else reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    // «ברפי 10 חזרות 3 פעמים», «פלאנק 30 שניות פעמיים», «ברפי 10 פעמיים»: the times after a count
    // are the sets (were reps 3 / a name «פלאנק פעמיים»); «סקוואט 15 פעמים» stays 15 reps.
    if (!setsExplicit) {
      var timesAll = s.match(/(?:^|\s)(?:\d+\s*פעמים|פעמיים)(?![א-ת])/g);
      var times = timesAll && timesAll[timesAll.length - 1];
      var timesLeft = times ? s.replace(times, ' ') : '';
      if (times && ((duration_seconds != null && duration_seconds !== defaults.workSeconds) || /\d/.test(timesLeft) || new RegExp(TIMED).test(timesLeft))) {
        var timesN = times.match(/\d+/);
        sets = timesN ? toInt(timesN[0]) : 2;
        setsExplicit = true;
        s = timesLeft;
      }
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
    // «דק׳» is «דקה» too: «2 דק׳ וחצי» is 150 s, «1/2 דק׳» is 30 s (was 120 s and a name «פלאנק 1»);
    // a bare «דק» too («פלאנק 2 דק» was a name «פלאנק 2 דק» with 10 invented reps), not «דקירות».
    m = s.match(/(?:(\d+)\s*(?:דקות|דקה|דק(?:[׳']|(?![\u0590-\u05FF]))|′)|שתי\s*דקות|דקה)\s*(?:וחצי|ו-?(?:1\/2|½))/);
    if (m) {
      if (m[1]) minSec = toInt(m[1]) * 60 + 30;
      else if (/שתי/.test(m[0])) minSec = 150;
      else minSec = 90;
      minMatch = m[0];
    } else if ((m = s.match(/(?:1\/2|½|חצי)\s*(?:דקה|דק(?:[׳']|(?![\u0590-\u05FF]))|′)/))) {
      minSec = 30;
      minMatch = m[0];
    } else if ((m = s.match(/שתי\s*דקות/))) {
      minSec = 120;
      minMatch = m[0];
    } else if ((m = s.match(/(\d+(?:\.\d+)?)\s*(?:דקות|דקה|דק(?:[׳']|(?![\u0590-\u05FF]))|′)/))) {
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
      m = s.match(/(\d+)\s*(?:דקות|דקה|דק(?:[׳']|(?![\u0590-\u05FF])))/);
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

  // «סדרות» is the other Hebrew word for sets: «סקוואט 3 סדרות של 12» was a name
  // «סקוואט 3 סדרות של» with one set. Read it as «סטים» / «סט» everywhere.
  var SERIES_RX = /(^|[^֐-׿])([בלהו]{0,2})סדר(ות|ה)(?![֐-׿])/g;

  function normalizeSetWords(text) {
    return text.replace(SERIES_RX, function (all, pre, prefix, end) {
      return pre + prefix + (end === 'ות' ? 'סטים' : 'סט');
    });
  }

  // «מנוחה 1,5 דקות», «פלאנק 1,5 דקות», «12,5 קג»: a comma decimal before a unit is the
  // decimal point, not a separator (was a rest of 1 s plus an exercise «בין סטים», a name «לחיצת חזה 12»).
  var DECIMAL_COMMA_RX = /(\d),(\d{1,2})(?=\s*(?:דק|שע|ק\s*["״׳']?\s*ג(?![֐-׿])|קילו(?!מ)|kg))/gi;

  function normalizeDecimalComma(text) {
    return text.replace(DECIMAL_COMMA_RX, '$1.$2');
  }

  function ingestText(text, catalogOrList) {
    var raw = normalizeSetWords(normalizeDecimalComma(stripEmoji(text))).trim();
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
