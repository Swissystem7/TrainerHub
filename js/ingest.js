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

  // "הפסקה" (break) is used for rest as often as "מנוחה" in trainers' messages, and both come in
  // the plural too: «מנוחות של 45 שניות», «הפסקות של דקה» (were a phantom exercise «מנוחות של»).
  var REST_RX = /מנוח(?:ה|ות)|הפסק(?:ה|ות)/;

  // The rest clause of one line: «מנוחה 30 שניות», «עם 60 שניות מנוחה»,
  // «מנוחה של דקה בין הסטים», «מנוחה 1:00». A line that holds nothing else is
  // a rest line; an exercise line keeps its name and takes the clause as its rest.
  var MINUTE_UNIT = '(?:דקות|דקה|דק(?:[׳\'′]|(?![\\u0590-\\u05FF])))';
  var SECOND_UNIT = '(?:שניות|שנייה|שניה|שנ(?:[׳\']|(?![\\u0590-\\u05FF])))';
  var TIME_UNIT = '(?:' + SECOND_UNIT + '|' + MINUTE_UNIT + ')';
  // «דקה ו-30 שניות», «1 דקות 30 שניות» (a tick «1' 30"» written out): the seconds after the
  // minutes belong to them. ws is the whitespace class, as in restFiller below.
  function minSecTail(ws) {
    return '(?:' + ws + '*(?:ו-?' + ws + '*)?\\d+' + ws + '*' + SECOND_UNIT + ')?';
  }
  var HALF = '\\s*(?:וחצי|ו-?(?:1\\/2|½))';
  var TIMED = '(?:\\d{1,2}:[0-5]\\d|(?:1\\/2|½|חצי)\\s*' + MINUTE_UNIT + '|\\d+(?:\\.\\d+)?\\s*' + TIME_UNIT + '(?:' + HALF + ')?|(?:שתי\\s*דקות|דקה)\\s*וחצי|חצי\\s*דקה|שתי\\s*דקות|דקה(?:\\s+אחת)?)';
  // «בין הסטים», «בין סט לסט», «בין כל סבב»: where the rest goes. ws is the whitespace class -
  // scanDefaults reads the whole paste and must not let a filler reach the next line.
  function restBetween(ws) {
    return '(?:בין' + ws + '+(?:ה?סטים|ה?סבבים|ה?תרגילים|כל' + ws + '+(?:סט|סבב|תרגיל)|(?:סט|סבב|תרגיל)' + ws + '+ל(?:סט|סבב|תרגיל)))';
  }
  // «מנוחה מינימלית», «מנוחה מלאה», «מנוחה לפי הצורך», «מנוחה כמה שצריך», «מנוחה קצרה ככל האפשר»,
  // «מנוחה עד התאוששות», «מנוחה של מינימום 3 דקות»: the words trainers hang on the rest word when
  // they do not give a time, or before the time they give (were a clip-less phantom exercise
  // «מינימלית» / «לפי הצורך» of 10 invented reps, as «מנוחה קצרה» was once). The multi-word
  // phrases come first so «עד התאוששות» is not «עד» and a leftover «התאוששות».
  // «מנוחה בזמן שבן הזוג עובד», «מנוחה כשהזוג עובד»: the IGO-UGO rest, while the partner works
  // (was a phantom exercise «בזמן שבן הזוג עובד» of 10 invented reps).
  function restQualifier(ws) {
    return '(?:(?:בזמן' + ws + '+ש|כש|כאשר' + ws + '+)(?:ה?(?:בן|בת)' + ws + '+ה?זוג|ה?זוג|ה?(?:שותפ(?:ה|ים)?|שותף|פרטנר(?:ית)?|חבר(?:ה|ים)?))' +
      ws + '+(?:עוב(?:ד|דת|דים|דות)|מתאמנ(?:ת|ים|ות)|מתאמן)|ככל' + ws + '+(?:האפשר|הנדרש|הצורך)|כמה' + ws + '+ש(?:פחות|צריך|צריכים|נדרש|רוצים|בא)|' +
      'לפי' + ws + '+ה?(?:צורך|הרגשה|תחושה)|במידת' + ws + '+הצורך|בהתאם' + ws + '+לצורך|אם' + ws + '+צריך|' +
      'עד' + ws + '+ל?התאוששות|מינימלית?|מינימום|מקסימום|לפחות|עד|בערך|כנדרש|מלא(?:ה|ות)?|מוחלטת?|' +
      'בינוני(?:ת|ות)?|חופשי(?:ת|ות)?|רגיל(?:ה|ות)?|סביר(?:ה|ות)?|מספק(?:ת|ות)?|קל(?:ה|ות)?)';
  }
  // «מנוחה 30 שניות כל פעם» / «בכל פעם»: the rest after every set, as «אחרי כל סט» (was a phantom
  // exercise «כל פעם» of 10 invented reps, and inline a name «סקוואט כל פעם»).
  function restFiller(ws) {
    return '(?:' + ws + '+(?:של|פעיל(?:ה|ות)|קצר(?:ה|ות)|ארוכ(?:ה|ות)|' + restQualifier(ws) + '|' + restBetween(ws) + '|(?:ל|אחרי' + ws + '+)כל' + ws + '+ה?(?:סט|סבב|תרגיל)|(?:ב|אחרי' + ws + '+)?כל' + ws + '+פעם)(?![\\u0590-\\u05FFa-zA-Z]))*';
  }
  var REST_FILLER = restFiller('\\s');
  var REST_FILLER_LINE = restFiller('[ \\t]');
  // «מנוחה בין הסטים 45 שניות» / «בין הסטים מנוחה 45 שניות»: the place of the rest may come before
  // its time, or before the rest word itself (was a phantom exercise «בין הסטים» / «בין סט»).
  var REST_AFTER_RX = new RegExp('(?:(?:^|\\s)' + restBetween('\\s') + '\\s+)?(?:(?:^|\\s)עם\\s+)?(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER + '(?:(?:\\s*[:\\-–]\\s*|\\s+)(?:' + TIMED + minSecTail('\\s') + '|\\d+(?![\\d:])))?' + REST_FILLER);
  // «עבודה 40 שניות», «עבודה: 40», «40 שניות עבודה»: the work time of an interval paste.
  var WORK_RX = new RegExp('עבודה\\s*[:\\-–]?\\s*(?:' + TIMED + '|\\d+(?![\\d:]))|' + TIMED + '\\s*עבודה');
  // «סקוואט 3x12 דקה מנוחה» is 3×12 with a minute's rest (was 1×3 with 720 s): the time does not start
  // inside the count, and «12 דקה» is 12 then a minute (twelve minutes is «12 דקות»).
  var REST_BEFORE_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?<![\\d:.\\/]|[x×X*]\\s*)(?!(?:[2-9]|\\d{2,})\\s*דקה(?!ות))' + TIMED + '\\s+(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER);
  // «ברפי 40 שניות 20 מנוחה»: a bare number before the rest word is its seconds, as «20 מנוחה» alone is.
  // Not the reps of a pair: «סקוואט 3x12 מנוחה» is 3×12 with the default rest (was 1×3 with 12 s).
  var BARE_REST_BEFORE_RX = new RegExp('(?:(?:^|\\s)עם\\s+)?(?<![\\d:.\\/]|[x×X*]\\s*)\\d+\\s+(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER);
  // «בלי מנוחה», «ללא הפסקות בין התרגילים», «אין מנוחה בכלל»: no rest at all - 0 seconds, not the
  // default 60 (was a phantom exercise «בלי» / «ללא» of 10 invented reps, and inline «סקוואט 3x12
  // בלי מנוחה» a name «סקוואט בלי»). ws as in restFiller - scanDefaults reads the whole paste.
  function noRest(ws) {
    return '(?:(?:^|' + ws + ')' + restBetween(ws) + ws + '+)?(?:^|' + ws + ')(?:בלי|ללא|אין)' + ws + '+(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))(?:' + ws + '+(?:בכלל|כלל))?' + restFiller(ws);
  }
  var NO_REST_RX = new RegExp(noRest('\\s'));
  var NO_REST_LINE_RX = new RegExp(noRest('[ \\t]'), 'm');
  // «40 שניות עבודה 20 מנוחה», «עבודה 40 מנוחה 20», «30 שניות עבודה / 15 שניות מנוחה»: the work
  // and the rest of one interval; a bare number on either side is seconds.
  var PAIR_VALUE = '(' + TIMED + '|\\d+(?![\\d:.]))';
  var WORK_REST_RX = new RegExp('(?:עבודה\\s*[:\\-–]?\\s*' + PAIR_VALUE + '|' + PAIR_VALUE + '\\s*עבודה)\\s*[,\\/|]?\\s*' +
    '(?:ו?(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))\\s*[:\\-–]?\\s*' + PAIR_VALUE + '|(?:ו-?)?' + PAIR_VALUE + '\\s*ו?(?:מנוח(?:ה|ות)|הפסק(?:ה|ות)))');
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
  // «טבאטה 8 סבבים 20/10», «HIIT 40/20 x6», «8 סבבים של 20/10»: the header of an interval paste
  // holds its format word, its rounds and its times, and nothing else. Once they are taken off,
  // a header has no letters left while «ברפי 40/20 x3» keeps its name. The rounds («8 סבבים»,
  // «x8», «8x», «8 פעמים») were letters too - «x» is one - so the header stayed an exercise.
  var INTERVAL_ROUNDS_RX = /(?:^|\s)(?:\d+\s*(?:סבבים?|פעמים|סטים?)|[x×]\s*\d+|\d+\s*[x×]|של|פעמיים)(?=[\s:,.\-–]|$)/gi;
  var INTERVAL_X_RX = /(?:^|\s)(?:[x×]\s*(\d+)|(\d+)\s*[x×]|(\d+)\s*פעמים|(פעמיים))(?=[\s:,.\-–]|$)/i;

  function intervalHeaderLeft(s) {
    return String(s || '').replace(INTERVAL_WORD_RX, ' ').replace(INTERVAL_ROUNDS_RX, ' ');
  }

  // s is the line with its work/rest pair already taken out.
  function isIntervalHeader(s) {
    return !/[א-תa-zA-Z]/.test(intervalHeaderLeft(s));
  }

  // The rounds an interval header states beside its times: «x8» / «8x» / «8 פעמים» (a «8 סבבים»
  // is read for the whole paste already).
  function intervalHeaderRounds(s) {
    var m = String(s || '').match(INTERVAL_X_RX);
    if (!m) return null;
    return m[4] ? 2 : toInt(m[1] || m[2] || m[3]);
  }
  // «30 שניות לכל תרגיל», «כל תרגיל 45 שניות», «דקה על כל תרגיל»: the work time of every
  // exercise in the paste. Not a rest: «מנוחה 30 שניות לכל תרגיל», «מנוחה בין כל תרגיל 30 שניות».
  var PER_EXERCISE = '(?<![\\u0590-\\u05FF])(?<!בין\\s+)(?:[לב]|על\\s+)?כל\\s+ה?תרגיל(?![\\u0590-\\u05FF])';
  var PER_EXERCISE_WORK_RX = new RegExp('(?<!(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))[\\s:\\-–]*)(?<![\\d:])(' + TIMED + ')\\s*' + PER_EXERCISE + '|' +
    PER_EXERCISE + '\\s*[:\\-–]?\\s*(' + TIMED + ')(?!\\s*(?:מנוח(?:ה|ות)|הפסק(?:ה|ות)))');

  // Minutes as trainers write them: «2 דקות», «2 דק׳» («2 דק» once fold() dropped the geresh),
  // «2 דק׳ וחצי», «1/2 דקה», «½ דק׳», «1.5 דקות», «דקה וחצי». Null when there are none.
  var HALF_RX = new RegExp(HALF);
  var HALF_MINUTE_RX = new RegExp('(?:1\\/2|½|(?<!ו)חצי)\\s*' + MINUTE_UNIT);
  var MINUTES_RX = new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + MINUTE_UNIT);

  // A rest given in minutes, on one line: «מנוחה 3 דקות», «מנוחה: דקה וחצי», «2.5 דקות מנוחה».
  // «סקוואט 3x12 דקה מנוחה» is a minute, not 12 (the count before «דקה» belongs to the x).
  var MINUTE_TIME = '(?:(?:1\\/2|½|חצי)[ \\t]*' + MINUTE_UNIT + '|\\d+(?:\\.\\d+)?[ \\t]*' + MINUTE_UNIT +
    '(?:[ \\t]*(?:וחצי|ו-?(?:1\\/2|½))|' + minSecTail('[ \\t]') + ')|(?:שתי[ \\t]*דקות|דקה)[ \\t]*וחצי|שתי[ \\t]*דקות|דקה' + minSecTail('[ \\t]') + ')';
  var REST_MINUTES_RX = new RegExp('(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER_LINE + '[ \\t]*[:\\-–]?[ \\t]*(' + MINUTE_TIME + ')|' +
    '(?<![\\d:.\\/]|[x×X*][ \\t]*)(' + MINUTE_TIME + ')[ \\t]*(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))');

  var MIN_SEC_TAIL_RX = new RegExp('^' + minSecTail('\\s'));

  // «1 דקות 30 שניות» / «דקה ו-30 שניות» is 90 s: the seconds right after the minutes (was 60 s).
  function tailSeconds(t, m) {
    var tail = t.slice(m.index + m[0].length).match(MIN_SEC_TAIL_RX);
    var secs = tail && tail[0] && tail[0].match(/\d+/);
    return secs ? toInt(secs[0]) : 0;
  }

  function minuteSeconds(s) {
    var t = String(s || '');
    var half = HALF_RX.test(t) ? 30 : 0;
    if (HALF_MINUTE_RX.test(t)) return 30;
    if (/שתי\s*דקות/.test(t)) return 120 + half;
    var m = t.match(MINUTES_RX);
    if (m) return Math.round(parseFloat(m[1]) * 60) + half + tailSeconds(t, m);
    m = t.match(/דקה/);
    if (m) return 60 + half + tailSeconds(t, m);
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
    var none = t.match(NO_REST_RX);
    if (none) return { found: true, rest: 0, text: t.replace(none[0], ' ') };
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
    // «טבאטה 8 סבבים 20/10: סקוואט, ברפי»: the slash header before the colon is a prefix too.
    var p = slashPair(t);
    if (p) return isIntervalHeader(t.replace(p.text, ' '));
    if (!WORK_RX.test(t) && !REST_RX.test(t) && !new RegExp(TIME_UNIT).test(t)) return false;
    t = splitRest(t).text.replace(WORK_RX, ' ').replace(new RegExp(TIMED, 'g'), ' ')
      .replace(/(?:^|\s)(?:ל?כל|בין|ה?תרגיל(?:ים)?|ה?סבבים?|ה?סטים?|עבודה|מנוח(?:ה|ות)|הפסק(?:ה|ות)|ו)(?=[\s,\/]|$)/g, ' ');
    return !/[א-תa-zA-Z]/.test(t);
  }

  // Cues a trainer writes after the name. They go to the notes so the name
  // still matches its clip («לאנג׳ לכל רגל» found nothing in the catalog).
  // `open` marks a prescription that is not a rep count (to failure, distance).
  // A bare «לצד» is a direction («פלאנק מצד לצד», «הרמת רגל לצד»), only «לרגל» is per side -
  // unless a hand/elbow/knee goes to it or a side follows: «אולר יד לרגל נגדית» is the name
  // (was «אולר יד נגדית» with a «לכל רגל» note, in the ready-made workouts too).
  var PER_SIDE_RX = /(?:^|\s)(?:[לב]?כל\s+(צד|רגל|יד|זרוע|כיוון)|(?<!(?:יד|ידיים|מרפק|ברך)\s+)ל(רגל)(?!\s+ה?(?:נגדית|נגדי|שנייה|שניה|הפוכה|ימין|שמאל|ימנית|שמאלית)(?![א-ת])))(?=[\s,.]|$)/;
  // «לאנג׳ 12 שני הצדדים» / «לשני הצדדים» / «משני הצדדים» is the count on each side too
  // (was a clip-less name «לאנג׳ 12 שני הצדדים» with 10 invented reps).
  var BOTH_SIDES_RX = /(?:^|\s)[לבמ]?(?:שני|2)\s+(?:ה)?צדדים(?=[\s,.]|$)/;
  // A bare «מקסימום» / «מקס» / «max» is to failure too: «שכיבות סמיכה 3 סטים מקסימום» was a name
  // «שכיבות סמיכה מקסימום» with 10 invented reps, «מתח 3xמקס» a name «מתח 3 מקס» with one set.
  var FAILURE_RX = /(?:^|\s|(?<=[x×]))(?:עד\s+(?:ה)?כשל|(?:מקס(?:ימום)?|[Mm][Aa][Xx])(?:\s+(?:חזרות|זמן))?|כמה\s+שיותר\s+חזרות)(?=[\s,.]|$)/;
  var DISTANCE_RX = /(?:^|\s|(?<=[x×]))(\d+)\s*(?:מטרים|מטר|מ[׳'])(?![\u0590-\u05FF])/;
  // «ריצה 3 קמ», «ריצה 2.5 ק"מ», «הליכה 5 קילומטר»: the distance too (was a name «ריצה 2 5 קמ» with 10 invented reps).
  var KM_RX = /(?:^|\s|(?<=[x×]))(\d+(?:\.\d+)?)\s*(?:ק\s*["״׳']?\s*מ|קילומטר(?:ים)?|km)(?![\u0590-\u05FFa-zA-Z])/i;
  // The load: «לחיצת חזה 4x8 80 קג», «סקוואט 3x10 עם 20 קילו», «דדליפט 5x5 100kg» (not «קילומטר»).
  // «4x8 +60kg», «4x8+60 ק"ג»: a «+» glued to the load is the same «with».
  var WEIGHT_RX = /(?:^|\s|\+)(?:עם\s+)?(\d+(?:\.\d+)?)\s*(?:ק\s*["״׳']?\s*ג|קילו(?:גרם)?|kg)(?![֐-׿a-zA-Z])/i;
  // The load after an at sign, as trainers write it: «סקוואט 3x12 @ 60 ק"ג», «דדליפט 5x5 @100» (kilos
  // even without the unit), «@ 70%» of the max, «@RPE 8» / «@8 RPE» the effort, «ריצה 2 ק"מ @ 5:30»
  // the pace. Each left «@» in the name («סקוואט @», «דדליפט @100», «סקוואט @ 70%») and the pace was
  // read as a 5:30 duration. A mention «@ירון» has no number after the sign and is untouched.
  var AT_LOAD_RX = /(?:^|\s)@\s*(?:(?:RPE|rpe)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:RPE|rpe)|(\d+(?:\.\d+)?)\s*(?:%|אחוז(?:ים)?)|(\d{1,2}:[0-5]\d)|(\d+(?:\.\d+)?)\s*(?:ק\s*["״׳']?\s*ג|קילו(?:גרם)?|kg)?)(?![֐-׿a-zA-Z\d])/;

  // A cue after a spaced dash: «סקוואט 15 - ירידה איטית», «שכיבות סמיכה 3x12 – מרפקים צמודים».
  // Only a digit-free tail that is not itself the prescription («פלאנק - דקה», «סקוואט - 15 חזרות»);
  // a hyphen inside a word («פשיטת-ברך») has no spaces around it.
  var DASH_CUE_RX = /\s[\-–—]\s+([^\d\-–—]*[\u0590-\u05FFa-zA-Z][^\d\-–—]*)$/;
  var PRESCRIPTION_WORD_RX = /דק|שני|שנ[׳']|חזרות|פעמים|סטים?|סבבים?|חצי|מנוח(?:ה|ות)|הפסק(?:ה|ות)/;
  // A cue after a colon that follows the prescription: «פלאנק 3x30: גב ישר», «סקוואט 3x12: לרדת עמוק»,
  // «פלאנק 3x30 שניות: מרפקים צמודים». The colon blocked the «3x30» pair (its lookahead guards a
  // clock «3x1:30»), so the line was a clip-less name «פלאנק 3 30 גב ישר» with one set of 10 invented
  // reps, and with a unit the cue rode into the name («פלאנק גב ישר»). Only a digit-free tail after a
  // part that holds a count; a clock «מנוחה 1:30» and a label «סבב 1: סקוואט 12» are not touched.
  var COLON_CUE_RX = /\s*:\s*((?=[א-תa-zA-Z])[^\d:()]*?)\s*(?=\(|$)/;
  // «סקוואט 10-12», «פלאנק 30-45 שניות», «10 עד 12 חזרות»: a range, not a name part (not a clock «1:00-1:30»).
  var RANGE_RX = /(?<![\d:.])(\d+)\s*(?:[\-–—]|עד)\s*(\d+)(?![\d:.])(?:\s*(חזרות|פעמים|שניות|שנ[׳']|דקות|סטים|סבבים)(?![\u0590-\u05FF]))?/;
  var CLOCK_RANGE_RX = /(?<!\d)(\d{1,2}:[0-5]\d)\s*(?:[\-–—]|עד)\s*(\d{1,2}:[0-5]\d)(?!\d)/;
  // «לחיצת חזה 10-8-6», «סקוואט 5-5-5-5-5», «דדליפט 8/6/4», «מתח 12-10-8-6 חזרות»: a rep ladder,
  // three counts or more joined tight. Not a range («10-12»), not a load/distance («60-70-80 ק"ג»).
  var LADDER_RX = /(?<![\d:.\/\-–—])(\d{1,3})((?:[\-–—\/]\d{1,3}){2,})(?![\d:.\/\-–—]|\s*(?:ק\s*["״׳']?\s*[גמ]|קילו|kg|km|מטר|מ[׳']))(?:\s*(חזרות|פעמים|שניות|שנ[׳']|דקות)(?![א-ת]))?/i;
  // «לחיצת חזה 4x8 + 60 ק"ג»: a count after a «+» that is a load is the weight, not a second side
  // (was 1x4 with a note «8+60» and a weight of 8 ק"ג).
  var PLUS_COUNT_RX = /(?<![\d:.\/])(\d+)(\s*(?:שניות|שנ[׳']|חזרות|["״]))?\s*\+\s*(\d+)(?![\d:.\/])(?!\s*(?:ק\s*["״׳']?\s*ג|קילו|kg|%))/i;
  var SLASH_COUNT_RX = /(?<![\d:.\/])(\d+)(\s*(?:שניות|שנ[׳']|חזרות|["״]))?\s*\/\s*(\d+)(?![\d:.\/])/;
  // «15 בכל סט», «12 לסט»: the count is per set anyway, the words are filler.
  var PER_SET_RX = /(?:^|\s)(?:ל?ב?כל|ל)\s*(?:סט|סבב)(?=[\s,.]|$)/g;
  // «שכיבות סמיכה 15 כל אחד», «סקוואט, לאנג׳, גשר 3x12 כל אחד», «פלאנק 30 שניות כל פעם»: the
  // count is for each exercise, the words are filler after a count. They rode into the name, so
  // no clip matched, and «15 כל אחד» was not read as the reps at all (10 invented reps).
  var EACH_RX = /(?:^|\s)(?:ל|ב)?כל\s+(?:אחד|אחת|פעם)(?=[\s,.)]|$)/g;
  // A tempo cue: a time with a word that says where it is held - «3 שניות למעלה», «2 שניות למטה»,
  // «החזקה של 3 שניות», «עצירה של 2 שניות למטה», «5 שניות הרפיה בין», «טמפו 3-1-1». Next to a
  // counted exercise («גשר 2x12 (3 שניות למעלה)») it is a note, not the work time: the bracket
  // used to be unwrapped into the line because it held a digit, so the line became a clip-less
  // name «גשר למעלה» with a 3-second duration (and «לחיצת חזה 4x8 (טמפו 3-1-1)» read the tempo
  // as a 3-rep ladder). A bare time («פלאנק 3 סטים (30 שניות)»), a rest («(מנוחה 30 שניות)»),
  // a load and a per-side count are not tempo cues and keep their meaning.
  var TEMPO_TIME_RX = /\d+(?:\.\d+)?\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![א-ת]))|דקות|דקה|דק(?:[׳']|(?![א-ת])))/;
  var TEMPO_WORD_RX = /(?:^|\s)טמפו(?=\s|$)/;
  // The tempo written plain after the prescription - «סקוואט 3x12 טמפו 3-1-1», «בטמפו 3-1-1»,
  // «tempo 3-1-1», «טמפו 3:1:1», «טמפו 3010» / «31X0», «טמפו איטי»: a note like the bracketed
  // «(טמפו 3-1-1)» (#329). The bare code was a 3-rep ladder and the word rode into the name
  // («סקוואט טמפו» 3x3 with a note «3-1-1»), so no clip was matched.
  var TEMPO_CLAUSE_RX = /(?:^|\s)(?:ב-?)?(?:טמפו|tempo)\s*:?\s*([0-9xX](?:\s*[\-–—:]\s*[0-9xX]){2,3}|\d\d[0-9xX]\d?(?!\s*(?:מטר|מ[׳']|ק\s*["״׳']?\s*[גמ]|קמ|קילו|km|kg|שנ|דק|חזרות|פעמים|[x×]\s*\d))|איטי|מהיר|מבוקר|בינוני|מתפרץ)(?![א-תa-zA-Z\d])/i;
  var TEMPO_NOT_RX = /עבודה|ק\s*["״׳']?\s*[גמ](?![א-ת])|קילו|kg|km|מטר|RPE|RIR|%|אחוז/i;
  // The effort / the load as a share of the max, written without the at sign: «דדליפט 5x5 RPE 8»,
  // «RPE 7-8», «8 RPE», «RIR 2», «70%», «ב-70%», «85% 1RM», «70% מהמקסימום», «70 אחוז». Each rode
  // into the name («דדליפט RPE 8», «סקוואט RPE 8 5» for 8.5, «דדליפט 70% מהמקסימום»), so the clip
  // was never matched; «RPE 7-8» also left a stray range note «7-8». Taken before the range so the
  // effort range is one note, and never after an at sign (AT_LOAD_RX reads those).
  var INTENSITY_RX = /(?<!@\s*)(?:^|\s)(?:(RPE|RIR)\s*[:\-]?\s*(\d+(?:\.\d+)?)(?:\s*[\-–—]\s*(\d+(?:\.\d+)?))?|(\d+(?:\.\d+)?)\s*(RPE|RIR)|(?:ב\s*-?\s*)?(\d+(?:\.\d+)?)\s*(?:%|אחוז(?:ים)?)(\s*(?:מ?ה?מקס(?:ימום)?|מ?\s*-?\s*1\s*RM|RM|דופק|מאמץ))?)(?![֐-׿a-zA-Z\d%])/i;
  // The heart rate on a cardio line: «ריצה 20 דקות דופק 150», «בדופק 140-150», «דופק: 150», «דופק עד 130»,
  // «150 bpm», «HR 150», «דופק 70%», «דופק אזור 2» / «zone 2», «דופק נמוך». It rode into the name
  // («ריצה דופק 150», «ריצה בדופק 140» with a stray range note «140-150»), «ריצה 5 ק"מ דופק 150» read
  // 150 reps, and the comma piece «, דופק 150» was a second exercise «דופק» of 150 reps. A number
  // followed by a time, a distance, a load or a multiplier is not the pulse («אימון דופק 30 דקות»).
  var HR_NUMBER = '\\d{2,3}(?:\\s*[\\-–—]\\s*\\d{2,3})?\\s*(?:%|אחוז(?:ים)?)?(?!\\s*(?:דק|שנ|ק\\s*["״׳\']?\\s*[גמ]|קמ|קילו|km|kg|מטר|חזרות|פעמים|סטים|סבבים|[x×]\\s*\\d))';
  var HR_UNIT = '(?:bpm|פעימות(?:\\s+[בל]דקה)?)';
  var HEART_RATE_RX = new RegExp('(?:^|\\s)(?:' +
    '(?:ב-?\\s*)?(?:דופק|HR|BPM)(?:\\s+(יעד|מטרה|ממוצע|מקסימלי|מקסימום|מקס[׳\']?))?\\s*:?\\s*(?:(עד|מעל|מתחת\\s*ל|של|ב)\\s*-?\\s*)?' +
    '(' + HR_NUMBER + '|נמוך|גבוה|בינוני|נוח|מתון|(?:אזור|זון|zone)\\s*\\d)(?:\\s*' + HR_UNIT + ')?' +
    '|(' + HR_NUMBER + ')\\s*(?:' + HR_UNIT + '|דופק)' +
    '|(?:זון|zone)\\s*(\\d)' +
    ')(?![\\u0590-\\u05FFa-zA-Z\\d%])', 'i');

  function hrNote(m) {
    var value = m[5] ? 'אזור ' + m[5] : (m[3] || m[4]);
    value = value.replace(/\s*[\-–—]\s*/g, '-').replace(/\s*אחוז(?:ים)?/, '%').replace(/(זון|zone)\s*/i, 'אזור ').replace(/\s+/g, ' ').trim();
    return 'דופק ' + (m[1] ? m[1] + ' ' : '') + (m[2] ? m[2].replace(/\s+/g, ' ') + ' ' : '') + value;
  }

  // A hold written plain after the count: «גשר 2x12 3 שניות למעלה», «סקוואט 3x10 2 שניות למטה»,
  // «החזקה של 3 שניות», «עצירה של 2 שניות למעלה», «ירידה של 3 שניות», «ירידה איטית 3 שניות»,
  // «3 שניות למטה 1 שנייה למעלה» - the same note the bracketed «(3 שניות למעלה)» is. It was read
  // as the work time and the word rode into the name («גשר למעלה» 2x12 held 3 s - workout mode ran
  // a 3-second timer instead of counting 12 reps), so no clip matched. A bare time of up to 10 s
  // next to a count («גשר 2x12 (3 שניות)», «מתח 5 חזרות 3 שניות») is a hold too: no set and no
  // rest is that short. Only with a count left on the line - «פלאנק 30 שניות», «פלאנק 3 סטים
  // 30 שניות», «ספרינט 3x10 שניות», «ריצה 8 פעמים 10 שניות» keep their time - or, with a hold
  // word, alone as a comma piece or a line of its own under the exercise.
  var HOLD_VERB = '(?:החזקה|החזק|להחזיק|תחזיקו?|עצירה|לעצור|תעצרו?|שהייה|הרפיה|ירידה|עלי[יה]ה)';
  var HOLD_PLACE = '(?:למעלה|למטה|בשיא|בסוף|בתחתית|בעלי[יה]ה|בירידה|באמצע|בשליטה|בכל\\s+חזרה)';
  var HOLD_SECONDS = '(\\d+(?:\\.\\d+)?)\\s*(?:שניות|שנייה|שניה|שנ(?:[׳\']|(?![א-ת])))';
  // «גשר 3x15 +החזקה 10 שניות»: a «+» glued to the hold word goes with the hold (the name was
  // «גשר +החזקה» and only the bare «10 שניות» reached the notes).
  var HOLD_CUE_RX = new RegExp('(?:^|\\s)[+&]?(?:' +
    '(?:עם\\s+)?' + HOLD_VERB + '(?:\\s+(?:איטית|מבוקרת|קצרה|קטנה))?(?:\\s+של)?\\s+' + HOLD_SECONDS + '(?:\\s+(?:' + HOLD_VERB + '|' + HOLD_PLACE + ')(?![א-ת]))*' +
    '|(?<![x×]\\s*)' + HOLD_SECONDS + '(?:\\s+(?:' + HOLD_VERB + '|' + HOLD_PLACE + '|איטית|מבוקרת)(?![א-ת]))+' +
    '|(?<![x×]\\s*)' + HOLD_SECONDS +
    ')(?![א-ת\\d])');
  var HOLD_MAX_BARE_SECONDS = 10;

  // The hold cue found on `t`, or null: a bare time only up to 10 s and only next to a count;
  // a time with a hold word next to a count or alone («3 שניות למעלה» as a piece or a line).
  function matchHold(t) {
    var m = t.match(HOLD_CUE_RX);
    if (!m) return null;
    var bare = m[3] != null;
    if (bare && parseFloat(m[3]) > HOLD_MAX_BARE_SECONDS) return null;
    var left = t.replace(m[0], ' ');
    var counted = /\d/.test(left.replace(new RegExp(TIMED, 'g'), ' ').replace(/\d+\s*(?:סטים?|סבבים?|פעמים)|פעמיים/g, ' '));
    if (!counted && (bare || /[א-תa-zA-Z]/.test(left))) return null;
    return { text: left, note: m[0].trim().replace(/^[+&]\s*/, '').replace(/^עם\s+/, '').replace(/\s+/g, ' ') };
  }

  function isTempoCue(s) {
    var t = String(s || '').trim();
    if (!t || !/\d/.test(t)) return false;
    if (REST_RX.test(t) || TEMPO_NOT_RX.test(t)) return false;
    if (TEMPO_WORD_RX.test(t)) return true;
    var time = t.match(TEMPO_TIME_RX);
    if (!time) return false;
    var left = t.replace(time[0], ' ');
    return /[א-תa-zA-Z]/.test(left) && !/\d/.test(left) && !PRESCRIPTION_WORD_RX.test(left);
  }

  function splitCues(s) {
    var t = String(s || '');
    var notes = [];
    var open = false;
    var failure = false;
    // «פלאנק 3x30: גב ישר»: the digit-free text after the colon is the cue, the count stays whole.
    var colonCue = t.match(COLON_CUE_RX);
    if (colonCue && /\d/.test(t.slice(0, colonCue.index)) && /[א-תa-zA-Z]/.test(t.slice(0, colonCue.index)) && !PRESCRIPTION_WORD_RX.test(colonCue[1])) {
      notes.push(colonCue[1].trim().replace(/\s+/g, ' '));
      t = t.slice(0, colonCue.index) + ' ' + t.slice(colonCue.index + colonCue[0].length);
    }
    // «סיבובים רוסים 3x20 (10 לכל צד)»: with a count outside, the per-side count in brackets is
    // the split of that count, a note (was a name «סיבובים רוסים 10»). «לאנג׳ (10 לכל רגל)» or
    // «לאנג׳ 3 סטים (12 לכל רגל)» has no count outside, so the bracket is the count.
    var counted = /\d/.test(t.replace(/\([^()]*\)/g, ' ').replace(/\d+\s*(?:סטים?|סבבים?)/g, ' '));
    t = t.replace(/\(([^()]*)\)/g, function (all, inner) {
      // «(3 שניות ירידה, 1 שנייה עלייה)», «(12 לכל רגל, לאט)», «(3 סטים, 12 חזרות)»: a bracket with a
      // digit and a comma is read piece by piece - each piece a note or an unwrapped count on its own.
      // A digit-free bracket («(גב ישר, ברכיים החוצה)») stays one note, as the trainer wrote it.
      var pieces = /\d/.test(inner) ? inner.split(PIECE_SEP_RX) : [inner];
      var kept = [];
      pieces.forEach(function (piece) {
        var side = piece.match(PER_SIDE_RX);
        if (counted && side && /^\s*\d+\s*(?:חזרות|פעמים)?\s*$/.test(piece.replace(side[0], ' '))) {
          notes.push(piece.trim().replace(/\s+/g, ' '));
          return;
        }
        // «גשר 2x12 (3 שניות למעלה)»: with a count outside, a tempo cue in brackets is a note.
        if (counted && isTempoCue(piece)) {
          notes.push(piece.trim().replace(/\s+/g, ' '));
          return;
        }
        if (/\d/.test(piece)) kept.push(piece.trim());
        // «(מנוחה 30 שניות, לאט)» after the rest clause was taken is «(, לאט)»: the stray comma is not part of the cue.
        else if (/[א-תa-zA-Z]/.test(piece)) notes.push(piece.replace(/^[\s,،;|•·]+|[\s,،;|•·]+$/g, ''));
      });
      return kept.length ? ' ' + kept.join(' ') + ' ' : ' ';
    });
    // «גשר 2x12 3 שניות למעלה» / «החזקה של 3 שניות» / «(3 שניות)»: the hold is a note, not the
    // work time (was a name «גשר למעלה» held 3 s). «3 שניות למטה 1 שנייה למעלה» is two notes.
    var hold;
    while ((hold = matchHold(t))) {
      notes.push(hold.note);
      t = hold.text;
    }
    // «סקוואט 3x12 טמפו 3-1-1»: the plain tempo is a note (the code was a 3-rep ladder before the
    // ladder match learned to skip it, and «טמפו» rode into the name). Taken before the range.
    var m = t.match(TEMPO_CLAUSE_RX);
    if (m) {
      notes.push('טמפו ' + m[1].replace(/\s+/g, '').replace(/[–—]/g, '-').toUpperCase());
      t = t.replace(m[0], ' ');
    }
    // «ריצה 20 דקות דופק 150» / «בדופק 140-150» / «150 bpm» / «דופק 70%»: the pulse is a note (was in the
    // name, or 150 reps after a distance). Taken before the effort so «דופק 70%» is not a bare «70%».
    m = t.match(HEART_RATE_RX);
    if (m) {
      notes.push(hrNote(m));
      t = t.replace(m[0], ' ');
    }
    // «דדליפט 5x5 RPE 8» / «RPE 7-8» / «70%» / «85% 1RM»: the effort or the share of the max is a note.
    m = t.match(INTENSITY_RX);
    if (m) {
      if (m[1] || m[5]) notes.push((m[1] || m[5]).toUpperCase() + ' ' + (m[2] || m[4]) + (m[3] ? '-' + m[3] : ''));
      else notes.push(m[6] + '%' + (m[7] ? ' ' + m[7].trim().replace(/\s+/g, ' ') : ''));
      t = t.replace(m[0], ' ');
    }
    // The lower bound is the count, the range stays in the notes
    // (was the name «סקוואט 10 12» with 10 invented reps).
    m = t.match(CLOCK_RANGE_RX);
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
      // «שכיבות סמיכה מקסימום 20» / «מתח מקס 8» caps the count, it is not to failure
      // (the note said «עד כשל» next to 20 reps). After the count only with its unit: «סקוואט 20 חזרות
      // מקסימום»; «מתח 3 מקס» is 3 sets to failure.
      var capUnit = '(\\s*(?:חזרות|שניות|שנ[׳\']|דקות|דקה|דק[׳\']))';
      var maxWord = /^\s*(?:מקס|[Mm])/.test(m[0]) && !/(?:חזרות|זמן)$/.test(m[0]);
      var cap = maxWord && (t.slice(t.indexOf(m[0]) + m[0].length).match(new RegExp('^\\s*(\\d+(?:\\.\\d+)?)' + capUnit + '?(?![\\d.])')) ||
        t.slice(0, t.indexOf(m[0])).match(new RegExp('(?:^|\\s)(\\d+(?:\\.\\d+)?)' + capUnit + '\\s*$')));
      notes.push(cap ? 'עד ' + cap[1] + (cap[2] || '').replace(/\s+/g, ' ') : 'עד כשל');
      if (!cap) open = failure = true;
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(KM_RX))) {
      notes.push(m[1] + ' ק"מ');
      open = true;
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(DISTANCE_RX))) {
      notes.push(m[1] + ' מטר');
      open = true;
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(AT_LOAD_RX))) {
      if (m[1] || m[2]) notes.push('RPE ' + (m[1] || m[2]));
      else if (m[3]) notes.push(m[3] + '%');
      else if (m[4]) notes.push('קצב ' + m[4]);
      else notes.push(m[5] + ' ק"ג');
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
    // «סקוואט @ 3x12»: a sign with no load after it is not part of the name either.
    if (/\d/.test(t)) t = t.replace(EACH_RX, ' ');
    t = t.replace(PER_SET_RX, ' ').replace(/(?:^|\s)@(?=\s|$)/g, ' ').replace(/\s[\-–—,]+\s*$/, ' ');
    return { text: t, notes: notes, open: open, failure: failure };
  }

  function isRestToken(s) {
    var t = Infer.fold(s);
    if (!t || !REST_RX.test(t)) return false;
    return !/[\u0590-\u05FFa-zA-Z]/.test(splitRest(t).text);
  }

  function parseRestSeconds(s) {
    var t = Infer.fold(s);
    if (!REST_RX.test(t)) return null;
    if (NO_REST_RX.test(t)) return 0;
    var clock = t.match(/(\d{1,2}):([0-5]\d)/);
    if (clock) return toInt(clock[1]) * 60 + toInt(clock[2]);
    // «מנוחה 2 דק׳» is 120 s, «מנוחה 2 דקות וחצי» 150 s, «מנוחה 1/2 דקה» 30 s
    // (were 2 s, 120 s and 1 s: the number was read as seconds and the half was dropped).
    var secs = minuteSeconds(t);
    if (secs != null) return secs;
    var m = t.match(/(\d+)\s*(?:שניות|שנ(?:[׳']|(?![\u0590-\u05FF])))/);
    if (m) return toInt(m[1]);
    m = t.match(/(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))\s*[:\-–]?\s*(\d+)/);
    if (m) return toInt(m[1]);
    // «20 מנוחה», «45 הפסקה» with no unit is seconds, as «מנוחה 20» is (was the default 60).
    m = t.match(/(?:^|\s)(\d+)\s*(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))/);
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
  var COUNT_UNIT = '(?:חזרות|שניות|שנ[׳\']|דקות|סטים|סדרות|סבבים|סיבובים|פעמים|צעדים|קילו)';
  var NUMBER_WORD_RX = new RegExp('(^|[^א-ת])(?:(של|[x×])\\s*)?' + NUMBER_PHRASE + '(?=(\\s+' + COUNT_UNIT + '(?![א-ת]))|(?![א-ת]))', 'g');

  // A count of one comes after a singular noun: «חזרה אחת», «סט אחד».
  var SINGLE_UNIT = { 'חזרה': 'חזרות', 'סט': 'סטים', 'סבב': 'סבבים' };
  var SINGLE_UNIT_RX = new RegExp('(^|[^א-ת])(?:(של)\\s+)?(' + Object.keys(SINGLE_UNIT).join('|') + ')\\s+(?:אחת|אחד)(?![א-ת])', 'g');

  function numberWordsToDigits(text) {
    return String(text || '').replace(SINGLE_UNIT_RX, function (all, pre, lead, noun) {
      return pre + (lead ? lead + ' ' : '') + '1 ' + SINGLE_UNIT[noun];
    }).replace(NUMBER_WORD_RX, function (all, pre, lead, tens, tensUnit, unit, teen, ten, unitAfter) {
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
    // «מנוחה בין הסטים 45 שניות» rests every exercise, as «מנוחה 45 שניות בין הסטים» does
    // (the place of the rest between the word and its time hid it, so only the last exercise rested).
    var SECONDS = '(\\d+)[ \\t]*(?:שניות|שנ(?:[׳\']|(?![\\u0590-\\u05FF])))';
    var rest = raw.match(new RegExp('(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER_LINE + '[ \\t]*[:\\-–]?[ \\t]*' + SECONDS)) ||
      raw.match(new RegExp(SECONDS + '[ \\t]*(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))')) ||
      // «מנוחה: 20» with no unit is seconds, as «מנוחה 20» is on an exercise line.
      raw.match(new RegExp('(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER_LINE + '[ \\t]*:[ \\t]*(\\d+)(?![\\d:.]|[ \\t]*(?:דק|ד[׳\']))'));
    if (rest) defaults.rest = toInt(rest[1]);
    // «40 שניות עבודה 20 מנוחה» / «עבודה 40 מנוחה 20»: the bare numbers are seconds (were dropped).
    var pair = null;
    raw.split('\n').some(function (line) { return (pair = line.match(WORK_REST_RX)); });
    // «40/20» / «טבאטה 20/10» on a line of its own is the interval of every exercise (was a phantom
    // exercise «40/20»); «ברפי 40/20» keeps its times to itself. «טבאטה 8 סבבים 20/10:» and
    // «טבאטה 20/10 x8» are that line too (their rounds kept them from being read, so the rows
    // under them got 8 sets of 10 invented reps, or the interval with no rounds at all), also
    // before a colon with the exercises after it («טבאטה 20/10 x8: סקוואט, ברפי»).
    var slash = null;
    var slashHeader = '';
    if (!pair) {
      raw.split('\n').some(function (line) {
        var colon = line.indexOf(':');
        return [line].concat(colon > 0 ? [line.slice(0, colon)] : []).some(function (part) {
          var p = slashPair(part);
          var left = p && part.replace(p.text, ' ');
          if (!p || !isIntervalHeader(left)) return false;
          slash = p;
          slashHeader = left;
          return true;
        });
      });
    }
    if (slash && defaults.sets == null) defaults.sets = intervalHeaderRounds(slashHeader);
    if (pair && defaults.rest == null) defaults.rest = timedSeconds(pair[3] || pair[4]);
    if (slash && defaults.rest == null) defaults.rest = slash.rest;
    var restClock = !rest && raw.match(new RegExp('(?:מנוח(?:ה|ות)|הפסק(?:ה|ות))' + REST_FILLER_LINE + '[ \\t]*[:\\-–]?[ \\t]*(\\d{1,2}):([0-5]\\d)'));
    if (restClock) defaults.rest = toInt(restClock[1]) * 60 + toInt(restClock[2]);
    // «מנוחה 3 דקות», «מנוחה דקה וחצי», «2.5 דקות מנוחה» are every exercise's rest, as «מנוחה 2 דקות»
    // and «מנוחה 90 שניות» are (only «דקה» and «2 דקות» were read, so «מנוחה 3 דקות» rested only the last one).
    var restMinutes = defaults.rest == null && raw.match(REST_MINUTES_RX);
    if (restMinutes) defaults.rest = minuteSeconds(restMinutes[1] || restMinutes[2]);
    // «בלי מנוחה» / «3 סבבים ללא הפסקות:» anywhere in the paste rests nobody, as «מנוחה 45 שניות»
    // rests everybody (only the exercise before the line got it, and as 60 s).
    if (defaults.rest == null && NO_REST_LINE_RX.test(raw)) defaults.rest = 0;
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

  // «10 חזרות ניתור לאדמה וגלגול», «4 מטר תנועה לפנים ונגיעה»: a «ו» tail that only
  // finishes the move (a touch, a roll, a landing, getting back up) is part of its name - it was split
  // off as a phantom exercise of 10 invented reps. «10 שכיבות סמיכה ומתח» and «10 סקוואט ו12 מתח» still split.
  var MOVE_TAIL_RX = /^\s*(?:נגיעה|נגיעות|גלגול|גלגולים|נחיתה|קימה|חזרה|חזרה לעמידה)(?:\s+(?:ב|ל|על)[^\s\d]*)*(?=\s*(?:\d|[.:]|$))/;

  function maskMoveTails(line) {
    return String(line || '').split(/([,،;|•·←→]|\s-+>\s|\s<-+\s)/).map(function (seg, i) {
      if (i % 2 || seg.indexOf('(') !== -1) return seg;
      var parts = seg.split(/(\s+ו(?!חצי|רבע)(?=\d|\s*[֐-׿]))/);
      for (var j = 2; j < parts.length; j += 2) {
        if (MOVE_TAIL_RX.test(parts[j])) parts[j - 1] = parts[j - 1].replace('ו', VAV_MASK);
      }
      return parts.join('');
    }).join('');
  }

  // Pieces on one line: a comma, a «ו» before the next exercise, and the inline separators a
  // pasted list uses instead of a comma - «סופרמן 3x10 | פלאנק 30 שניות», «;», « • », «←», «->».
  var PIECE_SEP_RX = /[,،;|•·←→]|\s-+>\s|\s<-+\s|\s+ו(?!חצי|רבע)(?=\d|\s*[֐-׿])/;
  var PIECE_SEP_G_RX = new RegExp(PIECE_SEP_RX.source, 'g');

  // The pieces of a line, a separator inside brackets left alone: «סקוואט 3x10 (3 שניות ירידה, 1 שנייה
  // עלייה)» is one exercise with a two-part tempo cue, not «סקוואט ( ירידה» and a second exercise
  // «עלייה)» (the plain split cut the line at every comma, so the bracket was torn in two and its halves
  // rode into two names). An unclosed bracket splits as before.
  function splitPieces(line) {
    var s = String(line || '');
    if (s.indexOf('(') === -1) return s.split(PIECE_SEP_RX);
    var out = [];
    var start = 0;
    var m;
    PIECE_SEP_G_RX.lastIndex = 0;
    while ((m = PIECE_SEP_G_RX.exec(s))) {
      var before = s.slice(0, m.index);
      var depth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
      if (depth <= 0 || s.indexOf(')', m.index) === -1) {
        out.push(s.slice(start, m.index));
        start = m.index + m[0].length;
      }
      if (!m[0].length) PIECE_SEP_G_RX.lastIndex++;
    }
    out.push(s.slice(start));
    return out;
  }

  // «שכיבות סמיכה 20 + פלאנק 30 שניות» is two exercises: a «+» after a counted exercise and
  // before a named one splits like a comma. «סקוואט + קפיצה 10» (one combo move) and
  // «פלאנק 30+30 שניות» (no name after the «+») stay one piece.
  function splitPlus(line) {
    var parts = line.split(/(\s*\+\s*)/);
    var out = parts[0];
    for (var i = 2; i < parts.length; i += 2) {
      var left = splitPieces(out).pop();
      var right = parseExerciseToken(splitPieces(parts[i])[0], {});
      var split = /\d/.test(left) && /[א-תa-zA-Z]/.test(left) && right && !right.continuation && right.name;
      out += (split ? ', ' : parts[i - 1]) + parts[i];
    }
    return out;
  }

  // «סקוואט 3x12/לאנג׳ 3x10/פלאנק 3x30 שניות», «סקוואט 3x12 / לאנג׳ 3x10»: a slash between two counted
  // exercises is a separator like a comma (was one garbled exercise «סקוואט /לאנג׳ 3 10/פלאנק 3» with
  // the plank's clip, 3x12 and a 30-second timer). Only when each side is an exercise with its own
  // count and the right side opens with a name of two letters or more: «לאנג׳ 10/רגל», «3x10/צד»,
  // «10/10», «40/20», «3/30"», «1/2 דקה», «12 קמ/ש 20 דקות», «5:30/ק"מ» and «עבודה 40 / מנוחה 20» stay one piece.
  function splitSlash(line) {
    var parts = line.split(/(\s*\/\s*)/);
    var out = parts[0];
    for (var i = 2; i < parts.length; i += 2) {
      var left = splitPieces(out).pop();
      var rightPiece = splitPieces(parts[i])[0];
      var split = false;
      if (/\d/.test(left) && /\d/.test(rightPiece) && /^[֐-׿a-zA-Z]/.test(rightPiece.trim())) {
        var leftTok = parseExerciseToken(left, {});
        var rightTok = parseExerciseToken(rightPiece, {});
        split = !!(leftTok && leftTok.name && !leftTok.continuation && !leftTok.restOnly &&
          rightTok && rightTok.name && !rightTok.continuation && !rightTok.restOnly &&
          (rightTok.name.match(/[֐-׿a-zA-Z]/g) || []).length >= 2);
      }
      out += (split ? ', ' : parts[i - 1]) + parts[i];
    }
    return out;
  }

  // «EMOM 10 דקות», «AMRAP 12 דק׳», «EMOM 10»: the block's format and length, not an exercise
  // (was a phantom «EMOM» of 600 s, or a name «EMOM 10 סקוואט» before a colon). The exercises
  // under it carry it as a note. A token that starts with BLOCK_MARK is such a header.
  var BLOCK_HEADER_RX = new RegExp('^(?:(\\d+)\\s*' + MINUTE_UNIT + '\\s+)?(E\\d?MOM|AMRAP)(?:\\s+(?:של\\s+|במשך\\s+)?(\\d+)(?:\\s*(?:' + MINUTE_UNIT + '|min(?:utes)?|[\'′]))?)?$', 'i');
  var BLOCK_MARK = '\u0001';

  function blockHeader(s) {
    var m = String(s || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/[.:\s]+$/, '').replace(/\s+/g, ' ').trim().match(BLOCK_HEADER_RX);
    if (!m) return null;
    var mins = m[1] || m[3];
    return m[2].toUpperCase() + (mins ? ' ' + toInt(mins) + ' דקות' : '');
  }

  // The paste's rounds header: «3 סבבים:», «אימון רגליים 3 סבבים - סקוואט 15». A rest line
  // («מנוחה בין סבבים: 60 שניות») is not one, nor a dash that only leads into a count
  // («סקוואט 3 סבבים - 15 חזרות»): either dropped every line above it, the whole paste when it
  // came last. pre is the whole lines above the header line; their tokens come before ROUNDS_MARK
  // and the rounds are not theirs.
  var ROUNDS_MARK = '\u0003';
  function roundsHeader(raw) {
    var rx = /סבבים?\s*[:\-–]\s*(?=\S)/g;
    var m;
    while ((m = rx.exec(raw))) {
      var start = raw.lastIndexOf('\n', m.index) + 1;
      var end = raw.indexOf('\n', m.index);
      var rest = raw.slice(m.index + m[0].length, end < 0 ? raw.length : end);
      if (REST_RX.test(raw.slice(start, m.index))) continue;
      if (/^\d+\s*(?:חזרות|פעמים|שניות|שנ[׳']|דקות|דק[׳'])?\s*$/.test(rest)) continue;
      return { pre: raw.slice(0, start), body: raw.slice(m.index + m[0].length) };
    }
    return null;
  }

  // «חימום:» / «שחרור:» / «עיקרי:» over the lines below it: the section those exercises belong to.
  // The header was dropped as a title and its exercises went to Main, so a pasted warm-up ran as
  // the first exercises of the workout and the analysis said «חסר חימום». A token that starts
  // with PHASE_MARK switches the phase of the exercises after it.
  var PHASE_MARK = '\u0002';
  var WARMUP_LABEL_RX = /^ה?(?:חימום|הכנה)$/;
  var COOLDOWN_LABEL_RX = /^(?:ה?חלק\s+)?ה?(?:שחרור|קירור|מתיחות|התאוששות)(?:\s+(?:ו?מתיחות|סיום))?$/;
  var MAIN_LABEL_RX = /^(?:(?:ה?חלק|ה?אימון)\s+)?ה?(?:עיקרי|גוף\s+האימון)$|^(?:סבב|תחנה|בלוק|מחזור)(?:\s+(?:\d+|[א-י][׳']?|ה?(?:ראשון|שני|שלישי|רביעי|אחרון)))?$/;

  function sectionPhase(label) {
    var t = String(label || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/[.:\s]+$/, '').replace(/\s+/g, ' ').trim();
    if (WARMUP_LABEL_RX.test(t)) return 'Warm-up';
    if (COOLDOWN_LABEL_RX.test(t)) return 'Cool-down';
    if (MAIN_LABEL_RX.test(t)) return 'Main';
    return null;
  }

  // The phase a line opens: the whole line is the header («חימום:»), or its label («חימום: ריצה קלה»).
  function linePhase(line) {
    var whole = sectionPhase(line);
    if (whole) return whole;
    var m = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').trim().match(LABEL_RX);
    return m ? sectionPhase(m[1]) : null;
  }

  function splitTokens(text, list) {
    var vavRxs = vavNameRxs(list);
    var raw = numberWordsToDigits(text).trim();
    if (!raw) return [];
    // «3 סטים: סקוואט 12, שכיבות סמיכה 10» / «3 סטים של: ...»: the sets head every exercise after the
    // colon, as they do on a line of their own (only the first exercise got them, the rest one set).
    raw = raw.replace(/^(\s*\d+\s*סטים(?:\s+של)?)\s*:[ \t]*(?=\S)/, '$1\n');
    var tokens = [];
    var section = 'Main';
    var body = raw;
    // The lines above a «3 סבבים:» header are read too («ריצה קלה 5 דקות» before the rounds was
    // dropped with the title on the header line).
    var pre = '';
    var after = roundsHeader(raw);
    if (after) {
      pre = after.pre;
      body = after.body;
    } else {
      after = raw.match(/(?:^|\n)\s*\d+\s*סבבים?\s*(?:\n+|[,،]\s*)([\s\S]+)/);
      if (after) {
        pre = raw.slice(0, after.index);
        body = after[1];
      } else {
        // Only a colon on the first line: «דגש: גב ישר» on line 3 is not a title over the lines above it.
        var colon = raw.split('\n')[0].indexOf(':');
        if (colon > 0 && colon < 80) {
          var left = raw.slice(0, colon).trim();
          var right = raw.slice(colon + 1).trim();
          // «אימון רגליים: סקוואט 15» is a title; «פלאנק: 30 שניות» is the exercise itself.
          // «יום שני: רגליים» is a day header with its title: stripSectionLabel reads it line by line.
          if (right && !DAY_HEADER_RX.test(left.replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').trim()) && ((/^[^\d\n]{2,40}$/.test(left) && !/^[*_~\s]*[\d×xX]/.test(right)) || isIntervalPrefix(left))) {
            body = right;
            // «חימום: ריצה קלה 5 דקות» on the first line is the warm-up's label, not the title.
            section = sectionPhase(left) || section;
            if (section !== 'Main') tokens.push(PHASE_MARK + section);
          }
        }
      }
    }
    var pendingName = null;
    var lines = body.split('\n');
    if (pre.trim()) lines = pre.split('\n').concat([ROUNDS_MARK], lines);
    lines.forEach(function (line) {
      if (line === ROUNDS_MARK) {
        tokens.push(ROUNDS_MARK);
        pendingName = null;
        return;
      }
      // A blank line closes a warm-up that no «עיקרי:» header closes.
      if (!line.trim()) {
        if (section === 'Warm-up') tokens.push(PHASE_MARK + (section = 'Main'));
        return;
      }
      var held = pendingName;
      pendingName = null;
      if (repeatLineCount(line) != null) return;
      // «EMOM 10 דקות» alone, or before a colon with the exercise after it.
      var lineColon = line.indexOf(':');
      var header = blockHeader(line) || (lineColon > 0 && blockHeader(line.slice(0, lineColon)));
      var phase = header ? 'Main' : linePhase(line);
      if (phase) tokens.push(PHASE_MARK + (section = phase));
      if (header) {
        tokens.push(BLOCK_MARK + header);
        line = blockHeader(line) ? '' : line.slice(lineColon + 1);
        if (!line.trim()) return;
      }
      var first = tokens.length;
      // «סה"כ 25 דקות» / «בהצלחה!» at the end of a paste are not exercises.
      if (isTotalLine(line) || isSignOff(line, list)) return;
      // «אימון 12.10.26», «תאריך: 12/10/2026», «יום שני 12.10»: the date is not a count.
      line = stripDate(line);
      if (!line.trim()) return;
      // «אימון 45 דקות» / «אימון רגליים - 60 דקות»: the title and its length, not a 45-minute exercise.
      var titled = titleTime(line, list);
      if (titled) {
        line = titled.rest;
        if (!line.trim()) return;
      }
      if (isTitleRounds(line, list)) return;
      var stripped = stripSectionLabel(line);
      if (!stripped) {
        // «פלאנק:» with its «30 שניות» on the next line: the name waits for that line.
        var label = line.replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/[.:\s]+$/, '').replace(/\s+/g, ' ').trim();
        // «יום שני - אימון רגליים:» names the day, not the exercise below it.
        if (stripDayHeader(label) != null) label = '';
        if (/:\s*$/.test(line.replace(/[*#_~]/g, '')) && label.length > 1 && !SECTION_RX.test(label) && !TITLE_RX.test(label)) pendingName = label;
        return;
      }
      line = stripped;
      if (held) {
        var head = parseExerciseToken(splitPieces(line)[0], {});
        if (!head || head.continuation) line = held + ' ' + line;
      }
      line = splitPlus(line);
      line = splitSlash(line);
      // A title line inside the paste («אימון כוח», «תוכנית שבועית») unless it is a clip.
      if (!/\d/.test(line) && TITLE_RX.test(line.replace(/[*#_~]/g, ' ').trim()) && !matchName(line.replace(/[*#_~]/g, ' ').trim(), list || [])) return;
      var pieces = splitPieces(maskMoveTails(maskVavNames(line, vavRxs)))
        .map(function (s) { return s.split(VAV_MASK).join('ו').replace(/^[•\-*]\s*/, '').replace(/[.:]+$/, '').trim(); })
        .filter(function (s) {
          if (s.length <= 1) return false;
          if (/^\d+\s*סבבים?$/.test(s)) return false;
          // «כל הכבוד, מחר ממשיכים» / «סקוואט 3x12, סה"כ 10 דקות»: a sign-off or a total piece.
          if (isTotalLine(s) || isSignOff(s, list)) return false;
          return true;
        });
      eachPrescription(pieces).forEach(function (s) {
          // «פלאנק 30 שניות, ירידה איטית»: the cue rides on the exercise before it as a
          // parenthetical (splitCues makes it a note) instead of becoming an exercise.
          if (tokens.length > first && isCuePiece(s)) tokens[tokens.length - 1] += ' (' + s.replace(/[()]/g, ' ').trim() + ')';
          // «סקוואט 3x10, 20 קג»: the load rides on the exercise too (splitCues makes it a note).
          else if (tokens.length > first && isLoadPiece(s)) tokens[tokens.length - 1] += ' ' + s;
          else tokens.push(s);
        });
    });
    return tokens;
  }

  // «סקוואט, לאנג׳, גשר 3x12 כל אחד» / «סקוואט ולאנג׳ 3x12 כל אחד»: the count after the last name is
  // for every name before it too. Only when the last piece says «כל אחד» and the names before it
  // carry no count of their own; «סקוואט, לאנג׳ 3x12» (no «כל אחד») is untouched.
  function eachPrescription(pieces) {
    var n = pieces.length;
    if (n < 2) return pieces;
    var last = pieces[n - 1];
    EACH_RX.lastIndex = 0;
    var at = last.search(/\d/);
    if (at < 0 || !EACH_RX.test(last)) return pieces;
    EACH_RX.lastIndex = 0;
    var head = last.slice(0, at).replace(/[\s\-–—:]+$/, '');
    if (!/[א-תa-zA-Z]/.test(head)) return pieces;
    for (var i = 0; i < n - 1; i++) {
      if (/\d/.test(pieces[i]) || isCuePiece(pieces[i]) || isRestToken(pieces[i])) return pieces;
    }
    var rx = last.slice(at);
    return pieces.map(function (p, i) { return i < n - 1 ? p + ' ' + rx : p; });
  }

  // Section headers inside a paste: «עיקרי:», «קירור», «סבב 2», «חלק ב׳» are not exercises.
  // A digit-free line ending in a colon is a header too («תרגילי בטן:»). A header word as a
  // label («עיקרי: סופרמן 3x10») is dropped and the exercise after it is kept. A numbered
  // header («סבב 1: סקוואט 12», «תחנה 2: מתח 8») and a day («יום ב: מתח 3x8», «יום 1:»)
  // are labels too: the label used to need a digit-free text before the colon, so «סבב 1»
  // stayed in the name («סבב 1 סקוואט»), and «יום ב» was never a header while a first-line
  // «יום א:» was dropped as the title.
  var SECTION_RX = /^(?:(?:ה?חלק|סבב|סט|שלב|תחנה|בלוק|מחזור|שבוע)(?:\s+(?:\d+|[א-י][׳']?|ה?(?:ראשון|שני|שלישי|רביעי|אחרון|עיקרי)))?|יום\s+(?:\d+|[א-ז][׳']?|ה?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת))|(?:ה?חלק\s+)?ה?(?:עיקרי|סיום|שחרור|קירור|פתיחה|הכנה)|גוף\s+האימון)$/;
  var LABEL_RX = /^([^:]{2,30}?)\s*:\s*(?=\S)/;
  var TITLE_RX = /^(?:ה?(?:אימון|תוכנית|תכנית|שיעור)\s|ה?(?:חימום|מתיחות)$|תרגילי\s)/;

  // A date on a title line: «אימון 12.10.26», «אימון רגליים 12/10/2026», «תאריך: 12/10/2026»,
  // «יום שני 12.10», «12.10.26 אימון פלג גוף עליון», a bare «12/10/2026». The date was read as
  // a prescription: «אימון 12/10/26» was an exercise «אימון» of 3 sets (a rep ladder 12/10/26),
  // «אימון 12.10.26» a clip-less «אימון 12 10 26» with 10 invented reps, «תאריך: 12/10/2026» a
  // phantom «תאריך 12/10/2026». Only after a title word / «תאריך» / «יום», or first on the line
  // with a year or a title word after it; a ladder «12/10/8», a Tabata «20/10», a distance
  // «1.5 ק"מ» and a count-first «10 ברפי» are untouched. A title that is only the date (or the
  // title word, «אימון 3», «תאריך») is dropped; what else is on the line goes on as before.
  var DATE_RX = /(?<![\d:.\/])(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{4}|[2-3]\d))?(?![\d.\/]|:\d)/g;
  var DATE_LEAD_RX = /^(?:ה?(?:אימון|תוכנית|תכנית|שיעור|תאריך)|יום)(?=[\s:\-–]|$)/;
  var DATE_ONLY_RX = /^(?:ה?(?:אימון|תוכנית|תכנית|שיעור)(?:\s+(?:מס(?:פר|[׳'.])?\s*)?\d{1,2})?|תאריך)?$/;

  function stripDate(line) {
    var t = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/\s+/g, ' ').trim();
    if (t.search(DATE_RX) < 0) return line;
    var lead = DATE_LEAD_RX.test(t);
    var found = false;
    var rest = t.replace(DATE_RX, function (all, d, mo, y, offset) {
      var day = toInt(d), month = toInt(mo);
      if (!(day >= 1 && day <= 31 && month >= 1 && month <= 12)) return all;
      if (!lead && !(offset === 0 && (y || DATE_LEAD_RX.test(t.slice(all.length).trim())))) return all;
      found = true;
      return ' ';
    }).replace(/\s+/g, ' ').replace(/^[\s:\-–,]+|[\s:\-–,]+$/g, '').trim();
    if (!found) return line;
    return DATE_ONLY_RX.test(rest) ? '' : rest;
  }

  // A title line with the workout's length: «אימון 45 דקות», «אימון של 60 דקות», «אימון ל-45 דקות»,
  // «אימון רגליים - 60 דקות», «אימון כוח (45 דקות)», «תוכנית 30 דקות», «אימון 45 דק׳». The digit-free
  // title drops (TITLE_RX), but the minutes made the line an exercise: «אימון 45 דקות» was an
  // exercise «אימון» of 2700 seconds matched to the clip «אימון קונוסים תגובה וכוח» (the bare word is
  // a prefix of it), «אימון רגליים - 60 דקות» a clip-less «אימון רגליים» of 3600 seconds marked
  // «חסר סרטון», and workout mode opened a 45-minute timer before the first real exercise. The title
  // and its minutes are stripped; a digit-free tail («אימון 45 דקות בבית») is part of the title, a
  // tail with a count («אימון 45 דקות - סקוואט 3x12») is the exercise; the minutes become the
  // workout's duration_minutes when no «סה"כ» line states one. A title whose words are a clip
  // («אימון קונוסים 10 דקות», «אימון בטן 10 דקות») is that clip's exercise, as before.
  var TITLE_TIME_RX = new RegExp('^(ה?(?:אימון|תוכנית|תכנית|שיעור)(?:\\s+[^\\d:\\-–(,]*?)?)\\s*[:\\-–(]?\\s*(?:ל-?\\s*|של\\s+|כ-?\\s*)?(\\d{1,3})\\s*' + MINUTE_UNIT + '\\)?(?![\\u0590-\\u05FF\\d])');
  var TITLE_WORD_RX = /^ה?(?:אימון|תוכנית|תכנית|שיעור)$/;

  // «אימון קונוסים» fuzzy-matches the clip; «אימון קונוסים תגובה וכוח» is the clip's own name
  // («אימון קונוסים -תגובה וכוח») once the punctuation is ignored.
  function isClipName(title, list) {
    if (matchName(title, list || [])) return true;
    var plain = function (s) { return String(s || '').replace(/[^\u0590-\u05FFa-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); };
    var want = plain(title);
    return (list || []).some(function (e) { return e && e.he && plain(e.he) === want; });
  }

  function titleTime(line, list) {
    var t = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/\s+/g, ' ').trim();
    var m = t.match(TITLE_TIME_RX);
    if (!m) return null;
    var title = m[1].trim().replace(/\s+(?:של|ל)$/, '');
    if (!TITLE_WORD_RX.test(title) && (!TITLE_RX.test(title + ' ') || isClipName(title, list))) return null;
    var rest = t.slice(m[0].length).replace(/^[\s:\-–,)]+|[\s:\-–,.]+$/g, '').trim();
    return { minutes: toInt(m[2]), rest: /\d/.test(rest) ? rest : '' };
  }

  // «אימון רגליים - 3 סבבים» / «אימון 3 סבבים:» on a line of its own: the title and the paste's
  // rounds (scanDefaults reads the «3 סבבים»), not an exercise. The title rode on as an exercise
  // «אימון רגליים» of 3x10 invented reps. A clip title («אימון קונוסים 3 סבבים») stays the clip.
  var TITLE_ROUNDS_RX = /^(ה?(?:אימון|תוכנית|תכנית|שיעור)(?:\s+[^\d:\-–(,]*?)?)\s*[:\-–(,]?\s*(?:של\s+)?\d{1,2}\s*סבבים?\)?[\s:.!]*$/;

  function isTitleRounds(line, list) {
    var t = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/\s+/g, ' ').trim();
    var m = t.match(TITLE_ROUNDS_RX);
    if (!m) return false;
    var title = m[1].trim().replace(/\s+(?:של|ב)$/, '');
    return TITLE_WORD_RX.test(title) || (TITLE_RX.test(title + ' ') && !isClipName(title, list));
  }

  function titleMinutes(text, list) {
    var found = null;
    numberWordsToDigits(String(text || '')).split('\n').some(function (line) {
      var tt = titleTime(stripDate(line), list);
      if (tt) found = tt.minutes;
      return !!tt;
    });
    return found;
  }

  // A day or week header with the day's title after it: «יום שני אימון רגליים», «יום שני - רגליים»,
  // «יום ב׳ - אימון רגליים», «יום 1 - רגליים», «יום ראשון: חזה», «שבוע 1 - אימון רגליים»,
  // «שבוע 1 יום 2 - רגליים». SECTION_RX knew «יום שני» only as the whole line (or as a label
  // before a colon with the exercise after it), so the title rode on: «יום שני אימון רגליים»
  // was an exercise of that name with 10 invented reps, «יום שני - רגליים» an exercise «יום שני»
  // with the note «רגליים», «יום 1 - רגליים» a «יום» of 1 rep, «שבוע 1 - אימון רגליים» a «שבוע»
  // of 1 rep, «יום ראשון: חזה» an exercise «חזה», «יום א - חזה וגב» two exercises «יום א» and
  // «גב», «יום שני - סקוואט 3x12» a clip-less «יום שני סקוואט». The header is stripped; a
  // digit-free title after it (or a bare «אימון 1») is dropped with it, an exercise is kept.
  var DAY_HEADER_RX = /^(?:(?:יום|שבוע)\s+(?:\d{1,2}|[א-ז][׳']?|ה?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|אחרון))(?:\s*[:\-–,]\s*|\s+|$))+/;

  function stripDayHeader(t) {
    var m = String(t || '').match(DAY_HEADER_RX);
    if (!m) return null;
    var rest = t.slice(m[0].length).replace(/^[\s:\-–,]+|[\s:\-–,.]+$/g, '').trim();
    if (!rest || !/\d/.test(rest) || DATE_ONLY_RX.test(rest)) return '';
    return rest;
  }

  function stripSectionLabel(line) {
    var t = String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!/\d/.test(t) && /:$/.test(t)) return '';
    if (SECTION_RX.test(t.replace(/[.:]+$/, '').trim())) return '';
    var day = stripDayHeader(t);
    if (day != null) return day ? stripSectionLabel(day) : '';
    var m = t.match(LABEL_RX);
    if (m) {
      var label = m[1].trim();
      var rest = t.slice(m[0].length);
      // A section header may introduce a count («סבב 1: 10 ברפי»); a title word may not,
      // so «חימום: 5 דקות ריצה» and a clock «מנוחה 1:30» stay whole. An interval header
      // («טבאטה 8 סבבים 20/10: סקוואט קפיצה») is a label too - scanDefaults read its times.
      if (SECTION_RX.test(label) || isIntervalPrefix(label) || (!/^\d/.test(rest) && /^(?:ה?חימום|מתיחות|תרגילי\s|אימון\s)/.test(label))) {
        return line.slice(line.indexOf(':') + 1);
      }
    }
    return line;
  }

  // A total at the end of a paste: «סה"כ 25 דקות», «סה״כ זמן: 25 דקות», «זמן כולל 30 דקות»,
  // «משך האימון: 40 דק׳», «סה"כ 3 סבבים». It was an exercise named «סה"כ» (or «זמן כולל»)
  // of 1500 seconds; the stated minutes are now the workout's duration_minutes instead.
  var TOTAL_HEAD = 'סה[״"\']?כ|סך\\s+ה?כל|זמן\\s+(?:כולל|ה?אימון|משוער)|משך(?:\\s+ה?אימון)?|אורך\\s+ה?אימון';
  var TOTAL_RX = new RegExp('^(?:' + TOTAL_HEAD + ')(?=[\\s:\\-–]|$)');
  var TOTAL_MINUTES_RX = new RegExp('^(?:' + TOTAL_HEAD + ')(?:\\s+(?:זמן|משך|אימון))?\\s*[:\\-–]?\\s*(?:כ-?\\s*)?(\\d+)\\s*' + MINUTE_UNIT);

  function cleanLine(line) {
    return String(line || '').replace(/[*#_~]/g, ' ').replace(/^\s*[•\-]\s*/, '').replace(/[!?.…:)(]+$/, '').replace(/\s+/g, ' ').trim();
  }

  function isTotalLine(line) {
    return TOTAL_RX.test(cleanLine(line));
  }

  function totalMinutes(text) {
    var m = null;
    numberWordsToDigits(String(text || '')).split(/\n|[,،;]/).some(function (line) {
      var t = cleanLine(line);
      return TOTAL_RX.test(t) && (m = t.match(TOTAL_MINUTES_RX));
    });
    return m ? toInt(m[1]) : null;
  }

  // A sign-off line: «בהצלחה!», «כל הכבוד», «מחר ממשיכים», «תהנו», «נתראה מחר», «לשתות מים!»,
  // «שבת שלום». Each was an exercise of 10 invented reps («בהצלחה!» with the mark in its name).
  // A greeting may name who it is for: «בוקר טוב לכולם», «שבוע טוב חברים», «היי לכולם».
  var SIGNOFF_RX = /^(?:(?:שיהיה\s+|ש?תהיה\s+)?בהצלחה(?:\s.*)?|כל\s+הכבוד(?:\s.*)?|ת(?:ה|יה)נו(?:\s.*)?|נתראה(?:\s.*)?|(?:מחר|בשבוע\s+הבא|בפעם\s+הבאה)\s+ממשיכים|ממשיכים\s+(?:מחר|בשבוע\s+הבא|בפעם\s+הבאה)|יאללה(?:\s.*)?|תודה(?:\s.*)?|(?:אל\s+תשכחו\s+)?לשתות\s+(?:הרבה\s+)?מים|אימון\s+(?:טוב|נעים|מהנה|מוצלח|פורה)(?:\s.*)?|(?:שבוע|בוקר|ערב|לילה)\s+טוב(?:\s.*)?|צהריים\s+טובים(?:\s.*)?|שבת\s+שלום(?:\s.*)?|(?:היי|הי|שלום)\s+(?:לכולם|לכולן|חברים|חברות|כולם)(?:\s.*)?|זהו|סיימנו|זה\s+הכל|סוף(?:\s+ה?אימון)?|חג\s+שמח(?:\s.*)?)$/;

  function isSignOff(line, list) {
    var t = cleanLine(line);
    if (!t || /\d/.test(t) || !SIGNOFF_RX.test(t)) return false;
    return !matchName(t, list || []);
  }

  // A comma piece that is a coaching cue, not an exercise: tempo («לאט», «ירידה איטית»,
  // «בשליטה»), form («גב ישר», «מרפקים צמודים»), an instruction («דגש על...», «בלי לנעול»).
  // A body part counts only with its posture: «כתפיים וגב», «פלאנק ברכיים» are clips.
  var CUE_PIECE_RX = /^(?:לאט|איטי(?:ת|ים|ות)?|מהיר(?:ה|ים|ות)?|בשליטה|מבוקר(?:ת|ים|ות)?|בקצב\s+\S+|ב?(?:ירידה|עלייה|עליה)\s+(?:איטית|מהירה|מבוקרת|מתפרצת|בשליטה)|עצירה|החזקה\s+(?:למעלה|למטה|בסוף|בתחתית)|(?:גב|מרפקים|ברכיים|כתפיים|בטן|ראש|מבט|ידיים|רגליים|עקבים|אגן|חזה|גוף)\s+(?:ישר(?:ה|ים|ות)?|צמוד(?:ה|ים|ות)?|כפופ(?:ה|ים|ות)|נעול(?:ה|ים|ות)|פתוח(?:ה|ים|ות)|אסופ(?:ה|ים)|מכווצ(?:ת|ים)|מתוח(?:ה|ים|ות)|פנימה|החוצה|קדימה|אחורה|למעלה|למטה|לפנים|ניטרלי(?:ת)?|בקו)|דגש|להקפיד|הקפדה|לשמור|בלי|ללא|לא\s+ל\S+|לנשום|נשימה|טווח\s+(?:מלא|חלקי|תנועה))(?=\s|$)/;

  // A comma piece that is only a load: «20 קג», «עם 20 קילו», «100kg». It was dropped as an
  // exercise with no name, so «סקוואט 3x10, 20 קג» lost its weight. A distance is the same:
  // «ריצה 20 דקות, 3 קמ» lost its 3 ק"מ.
  function isLoadPiece(s) {
    var t = String(s || '').trim();
    var m = (' ' + t).match(WEIGHT_RX);
    if (m && m[0].trim() === t) return true;
    // «סקוואט 3x10, @60 ק"ג» / «, @ 70%»: the at-sign load is a piece of its exercise too.
    m = (' ' + t).match(AT_LOAD_RX);
    if (m && m[0].trim() === t) return true;
    // «סקוואט 3x12, RPE 8» / «, 70%»: the effort is a piece of its exercise too.
    m = (' ' + t).match(INTENSITY_RX);
    if (m && m[0].trim() === t) return true;
    // «ריצה 20 דקות, דופק 150»: the pulse is a piece of its exercise too (was an exercise «דופק» of 150 reps).
    m = (' ' + t).match(HEART_RATE_RX);
    if (m && m[0].trim() === t) return true;
    m = t.match(KM_RX);
    return !!m && m[0].trim() === t;
  }

  function isCuePiece(s) {
    var t = String(s || '').trim();
    // «סקוואט 3x12, טמפו 3-1-1»: the tempo is a cue with digits (was a second exercise «טמפו» 3x3).
    var m = (' ' + t).match(TEMPO_CLAUSE_RX);
    if (m && m[0].trim() === t) return true;
    // «גשר 2x12, 3 שניות למעלה»: the hold is a cue with digits too (was a second exercise «למעלה» of 3 s).
    // A bare «, 30 שניות» stays the count of the exercise before it.
    m = (' ' + t).match(HOLD_CUE_RX);
    if (m && m[0].trim() === t && m[3] == null) return true;
    return !/\d/.test(t) && !REST_RX.test(t) && CUE_PIECE_RX.test(t);
  }

  // Work time written in words: "שתי דקות ריצה במקום", "פלאנק שלוש דקות".
  var MINUTE_WORDS = { 'שתי': 2, 'שלוש': 3, 'ארבע': 4, 'חמש': 5, 'שש': 6, 'שבע': 7, 'שמונה': 8, 'תשע': 9, 'עשר': 10 };
  var MINUTE_WORDS_RE = /(^|\s)(שתי|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s+דקות(?=\s|$)/;

  // «קפיצות חבל 100 קפיצות», «סקוואט 15 סקוואטים», «שכיבות סמיכה 3x20 שכיבות»: a count followed by
  // a noun that repeats the exercise name is the reps (was a clip-less name «קפיצות חבל 100 קפיצות»
  // with 10 invented reps, or «קפיצות חבל קפיצות» 3x50). Only when the noun ends the token.
  function echoStem(w) {
    return w.replace(/[׳'"״]/g, '').replace(/(?:ים|ות|ה)$/, '');
  }
  var ECHO_ALIASES = { 'קפיצ': /^(?:ג[׳']?אמפ|jump)/i };
  function echoCountNoun(s) {
    return s.replace(/(\d)\s+([֐-׿][֐-׿׳']{2,})(?=\s*(?:$|[,.;)]))/g, function (all, d, word, at) {
      var noun = echoStem(word);
      // A unit or rest word is not an echo of the name: «ברפי 40 שניות מנוחה 20 שניות», «20 מנוחה».
      if (noun.length < 3 || /^(?:דק|שני|שנ[׳']|חזר|פעמ|סט|סב|סיבוב|סדר|מנוח|הפסק|עבוד|קילו|מטר)/.test(noun)) return all;
      var echoed = s.slice(0, at).split(/\s+/).some(function (w) {
        if (/\d/.test(w)) return false;
        var stem = echoStem(w);
        if (stem.length >= 3 && (stem.indexOf(noun) === 0 || noun.indexOf(stem) === 0)) return true;
        // «ג'אמפינג ג'קס 30 קפיצות»: a transliterated name echoed by its Hebrew noun (was a clip-less
        // name «ג'אמפינג ג'קס 30 קפיצות» with 10 invented reps).
        var alias = ECHO_ALIASES[noun];
        return !!alias && alias.test(w);
      });
      return echoed ? d + ' חזרות' : all;
    });
  }

  function parseExerciseToken(token, defaults) {
    defaults = defaults || {};
    // WhatsApp/markdown pastes: "4*10" is a multiplier, "*סופרמן*" is only bold.
    // «סקוואט 3 על 12» is said for 3×12 (was a name «סקוואט 3 על» with one set).
    var s = numberWordsToDigits(token).replace(/(\d)\s*\*\s*(?=\d)/g, '$1×').replace(/\*+/g, ' ')
      .replace(/(^|\s)(\d+)\s+על\s+(?=\d)/g, '$1$2×')
      // «לאנג׳ים הליכה 20 צעדים» is 20 reps (was a name «לאנג׳ים הליכה 20 צעדים» with 10 invented reps).
      .replace(/(\d)\s*צעד(?:ים)?(?![א-ת])/g, '$1 חזרות').trim();
    s = echoCountNoun(s);
    if (!s) return null;
    if (isRestToken(s)) {
      // «בלי מנוחה» / «מנוחה 0» is 0 s - only a missing time falls back (was 60: 0 read as none).
      var stated = parseRestSeconds(s);
      return { restOnly: true, rest_seconds: stated != null ? stated : (defaults.rest != null ? defaults.rest : 60) };
    }
    // List numbering: "1. סקוואט 15", "2) שכיבות", "תרגיל 3: פלאנק" (not "3.5 דקות", not "1:30").
    s = s.replace(/^(?:תרגיל\s*\d{1,2}\s*[.)\]:\-–]?\s*|\d{1,2}\s*[.)\]](?:\s+|(?=[\u0590-\u05FFa-zA-Z]))|\d{1,2}\s*:\s*(?=[\u0590-\u05FFa-zA-Z]))/, '').trim();
    if (!s) return null;
    var sets = defaults.sets != null ? defaults.sets : null;
    var setsExplicit = false;
    var reps = null;
    var duration_seconds = defaults.workSeconds != null ? defaults.workSeconds : null;
    var rest_seconds = defaults.rest != null ? defaults.rest : null;

    // «לחיצת חזה 10-8-6», «סקוואט 5-5-5-5-5», «דדליפט 3 סטים: 8/6/4»: a rep ladder is one set per count,
    // the first count is the reps and the ladder stays in the notes (was a name «לחיצת חזה 10 8 6» with
    // one set of 10 invented reps, «דדליפט 8/6/4», or «דדליפט /6/4» with 8 reps). Taken before the
    // range/slash cues so «2-4-6-8» is not a «2-4» range and «8/6/4» not a per-side pair.
    var ladder = null;
    // «לחיצת חזה 4x8 (טמפו 3-1-1)»: the tempo in brackets next to a counted exercise is a note
    // (splitCues takes it), not a 3-rep ladder - the bracket is blanked for the ladder match only.
    // «סקוואט 3x12 טמפו 3-1-1» without brackets is the same note (was a name «סקוואט טמפו» of 3x3).
    var lm = s.replace(/\(([^()]*)\)/g, function (all, inner) {
      return isTempoCue(inner) && /\d/.test(s.replace(/\([^()]*\)/g, ' ')) ? ' '.repeat(all.length) : all;
    }).replace(TEMPO_CLAUSE_RX, function (all) { return ' '.repeat(all.length); }).match(LADDER_RX);
    if (lm) {
      var ladderUnit = lm[3] || '';
      ladder = {
        counts: (lm[1] + lm[2]).match(/\d+/g).map(toInt),
        note: (lm[1] + lm[2]).replace(/[\-–—]/g, '-') + (ladderUnit ? ' ' + ladderUnit : ''),
        timed: /^(?:שניות|שנ|דקות)/.test(ladderUnit),
        minutes: /^דקות/.test(ladderUnit)
      };
      s = s.replace(lm[0], ' ');
    }

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
      // «טבאטה 8 סבבים 20/10:» / «טבאטה 20/10 x8» / «HIIT 6 סבבים 40/20» is the paste's interval
      // header (scanDefaults hands its times and rounds to every exercise), not an exercise «טבאטה»
      // of 8 sets (the rounds left letters behind - «x» is one - so the header passed as a name).
      if (isIntervalHeader(s)) return null;
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
    m = s.match(/(\d+)\s*(?:סטים?|סבבים?)\s*(?:של\s*)?(?:(\d+)(?!\d|:\d|\s*(?:שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|דק|["״′″]))(?:\s*(?:חזרות|פעמים))?)?/);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[2]) reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }
    // "3x12", "3 x 15 חזרות", "3x45 שניות" (sets × seconds), «3x2 דקות» / «3x1'» (sets × minutes -
    // was a name «פלאנק דקות» with 3 sets of 2 reps).
    m = s.match(/(\d+)\s*[x×]\s*(\d+)(?!\d|:\d)\s*(חזרות|פעמים|שניות|שנייה|שניה|שנ(?:[׳']|(?![\u0590-\u05FF]))|דקות|דקה|דק(?:[׳']|(?![\u0590-\u05FF]))|["״′″])?/i);
    if (m) {
      sets = toInt(m[1]);
      setsExplicit = true;
      if (m[3] && /^דק/.test(m[3])) duration_seconds = toInt(m[2]) * 60;
      else if (m[3] && m[3] !== 'חזרות' && m[3] !== 'פעמים') duration_seconds = toInt(m[2]);
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
    // «מתח 3 מקס», «שכיבות סמיכה 4 עד כשל»: a lone small count next to «to failure» is the sets,
    // not 3 reps to failure (a rep count and failure contradict). «שכיבות סמיכה 20 עד כשל» stays reps.
    if (cues.failure && !setsExplicit && reps == null && duration_seconds == null) {
      m = s.match(/(?:^|\s)([2-6])\s*[\-–—,.:]*$/) || s.match(/^([2-6])\s+/);
      if (m) {
        sets = toInt(m[1]);
        setsExplicit = true;
        s = s.replace(m[0], ' ').trim();
      }
    }
    m = s.match(/^(\d+)\s+/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // A count after the name: "שכיבות סמיכה 15". «סקוואט 15 - 3 סטים» leaves «סקוואט 15 -» once the
    // sets are taken: the dash before them is not part of the count (was a clip-less name «סקוואט 15»
    // with 10 invented reps).
    m = s.match(/\s(\d+)\s*[\-–—,.:]*$/);
    if (m && reps == null && duration_seconds == null) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }
    // The ladder: its length is the sets unless the paste said them («3 סטים: 8/6/4» keeps 3),
    // its first count the reps (or the time, «פלאנק 30-45-60 שניות»).
    if (ladder) {
      if (!setsExplicit) {
        sets = ladder.counts.length;
        setsExplicit = true;
      }
      if (ladder.timed) duration_seconds = ladder.counts[0] * (ladder.minutes ? 60 : 1);
      else reps = ladder.counts[0];
      cues.notes.unshift(ladder.note);
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
    // «ריצה של 30 דקות», «פלאנק למשך 30 שניות», «ריצה כ-20 דקות»: the word that led into the time
    // is not part of the name (was a clip-less «ריצה של» / «פלאנק למשך» / «ריצה כ»).
    // «ריצה במשך 5 ק"מ»: a distance (kept in the notes) led into the same way.
    var counted = reps != null || duration_seconds != null || cues.notes.some(function (n) { return /\d/.test(n); });
    // «שכיבות סמיכה לפחות 15», «ריצה עד 20 דקות», «פלאנק 30 שניות לפחות»: the bound on the count is a
    // note, not part of the name (was a clip-less «שכיבות סמיכה לפחות» / «ריצה עד» / «פלאנק לפחות»).
    if (counted) {
      // Only the bound on this count: «סקוואט 3x12 לפחות שעה אחרי אוכל» keeps its words.
      var bound = null, boundNote = null;
      name = name.replace(/(^|\s)(לכל הפחות|לפחות|מינימום|עד)(?=(\s|$))/g, function (all, lead, word, after, at, whole) {
        var bm = token.match(new RegExp('(?:^|\\s)' + word + '\\s*(?:של\\s*)?(\\d+(?:[.,]\\d+)?\\s*(?:שניות|שנ[׳\']|דקות|דקה|דק[׳\']|חזרות|ק"מ|קמ|מטר)?)'));
        var last = at + all.length === whole.length;
        if (bound || (!bm && !last) || (word === 'עד' && !last)) return all;
        bound = word;
        boundNote = bm ? word + ' ' + bm[1].trim() : word;
        return lead;
      }).replace(/\s+/g, ' ').trim();
      if (boundNote) cues.notes.unshift(boundNote);
    }
    if (counted) name = name.replace(/(?:\s+(?:של|למשך|במשך|בערך|כ))+$/, '');
    // «גשר 3x15 + החזקה 10 שניות»: the hold after the «+» went to the notes and left the «+» hanging
    // on the name (was a clip-less «גשר +»). «סקוואט + קפיצה» keeps the «+» between its two words.
    name = name.replace(/^(?:[+&]\s*)+|(?:\s*[+&])+$/g, '');
    if (!name || name.length < 2) {
      // "מתח 5 חזרות, 4 סטים": the comma split the sets off; hand them to the exercise before.
      // «סקוואט 3 סטים, 12 חזרות» / «, 30 שניות»: the count was split off the same way.
      var ownTime = duration_seconds != null && duration_seconds !== (defaults.workSeconds != null ? defaults.workSeconds : null);
      if (setsExplicit || reps != null || ownTime || (restClause.found && restClause.rest != null)) {
        var cont = { continuation: true, sets: setsExplicit ? sets : null, rest_seconds: restClause.found ? restClause.rest : null };
        if (reps != null) cont.reps = reps;
        if (ownTime) cont.duration_seconds = duration_seconds;
        // «מתח 5 חזרות, 4 סטים, לאט»: the cue joined the sets piece; it still belongs to the exercise.
        if (cues.notes.length) cont.notes = cues.notes.join(' · ');
        return cont;
      }
      // «ריצה 20 דקות» with «דופק 150» on the next line (or «RPE 8», «טמפו 3-1-1»): a line that is
      // only a cue with a number is that exercise's note (was a phantom «דופק» of 150 reps).
      // A digit-free line («עד כשל», «לאט») is left as it was.
      if (cues.notes.length && /\d/.test(token)) return { continuation: true, sets: null, rest_seconds: null, notes: cues.notes.join(' · ') };
      return null;
    }
    if (/^\d+$/.test(name)) return null;
    if (sets == null) sets = defaults.sets != null ? defaults.sets : 1;
    var countInvented = false;
    if (reps == null && duration_seconds == null) {
      duration_seconds = defaults.workSeconds || null;
      // "עד כשל" / "20 מטר" is the prescription; an invented 10 reps would contradict it.
      if (duration_seconds == null && !cues.open) {
        reps = 10;
        countInvented = true;
      }
    }
    var out = {
      name: name,
      sets: sets,
      reps: reps,
      duration_seconds: duration_seconds,
      rest_seconds: rest_seconds,
      notes: cues.notes.length ? cues.notes.join(' · ') : null,
      restOnly: undefined
    };
    // Not saved with the workout: only tells a later «, 12 חזרות» piece it may replace the 10.
    Object.defineProperty(out, 'countInvented', { value: countInvented });
    return out;
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

  // «סיבובים» is the other word for rounds: «בורפי 3 סיבובים של 10» was a name «בורפי 3 סיבובים»
  // with one set. Only after a count («3 סיבובים», «שלושה סיבובים», «סיבוב אחד»), and not on a line
  // whose exercise turns («סיבובי ידיים 10 סיבובים» is ten arm circles, not ten rounds).
  var ROUNDS_RX = new RegExp('(^|[^א-ת])((?:\\d+|' + NUMBER_PHRASE + ')\\s*)סיבובים(?![א-ת])|(^|[^א-ת])סיבוב(\\s+(?:אחד|אחת)(?![א-ת]))', 'g');

  function normalizeRoundWords(line) {
    if ((line.match(/סיבוב/g) || []).length > 1) return line;
    return line.replace(ROUNDS_RX, function (all) {
      return all.replace(/סיבובים$/, 'סבבים').replace(/סיבוב(?=\s)/, 'סבב');
    });
  }

  function normalizeSetWords(text) {
    return text.replace(SERIES_RX, function (all, pre, prefix, end) {
      return pre + prefix + (end === 'ות' ? 'סטים' : 'סט');
    }).split('\n').map(normalizeRoundWords).join('\n');
  }

  // «מנוחה 1'», «פלאנק 2׳», «ריצה 10′»: one tick after a number is minutes; «30"», «45״», «20″»,
  // «30''» are seconds, and «1' 30"» / «1'30"» a minute and a half. Only the primes ′ ″ and the
  // seconds mark were read, and only on an exercise line, so «מנוחה 1'» was a 1-second rest,
  // «פלאנק 1'» a clip-less name with 10 invented reps, «פלאנק 1' 30"» 30 s and «פלאנק 3x1′» 3 × 1 s.
  // Written out as «1 דקות» / «30 שניות» before anything reads the paste, the rest line, the
  // paste's defaults and the pairs all see them. «30"-45"» drops its first mark so the range keeps
  // its unit («30-45 שניות»). A tick after a letter («לאנג׳», «ק"ג», «5 מ'») is not a time.
  var TICK_RANGE_RX = /(\d+)\s*(["״″]|''|['׳′])\s*([\-–—])\s*(?=\d+(?:\.\d+)?\s*\2)/g;
  var SECOND_TICK_RX = /(\d+(?:\.\d+)?)\s*(?:["״″]|'')/g;
  var MINUTE_TICK_RX = /(\d+(?:\.\d+)?)\s*['׳′]/g;

  function tickWord(word) {
    return function (all, num, offset, str) {
      var next = str.charAt(offset + all.length);
      return num + ' ' + word + (next && !/[\s,.;:)\]|\/]/.test(next) ? ' ' : '');
    };
  }

  function normalizeTicks(text) {
    return text.replace(TICK_RANGE_RX, '$1$3').replace(SECOND_TICK_RX, tickWord('שניות')).replace(MINUTE_TICK_RX, tickWord('דקות'));
  }

  // «מנוחה 1,5 דקות», «פלאנק 1,5 דקות», «12,5 קג»: a comma decimal before a unit is the
  // decimal point, not a separator (was a rest of 1 s plus an exercise «בין סטים», a name «לחיצת חזה 12»;
  // «ריצה 2,5 קמ» was two exercises «ריצה» and «קמ»).
  var DECIMAL_COMMA_RX = /(\d),(\d{1,2})(?=\s*(?:דק|שע|ק\s*["״׳']?\s*[גמ](?![֐-׿])|קילו|kg|km))/gi;

  function normalizeDecimalComma(text) {
    return text.replace(DECIMAL_COMMA_RX, '$1.$2');
  }

  // «ריצה חצי שעה», «הליכה שעה», «רכיבה על אופניים שעה וחצי», «ריצה רבע שעה», «רכיבה שעתיים»,
  // «ריצה 1.5 שעות», «ריצה שעה ו-20 דקות»: the hour words trainers write on a cardio line were never
  // read, so the whole line was a clip-less exercise «ריצה חצי שעה» with 10 invented reps (and
  // «ריצה 3/4 שעה» 3 sets of 4). Written out in minutes before anything reads the paste, the exercise
  // line, the rest line («מנוחה חצי שעה») and the pairs all see them. Not a clock time («בשעה 18:00»,
  // «שעה 18:00», «השעה»), not «24 שעות לפני», not a relation («אחרי שעה», «תוך שעה», «כל שעה», «שעה
  // לפני האימון»), and never the digit-free title of a paste («אימון רגליים - שעה», «אימון של שעה»),
  // which drops as a title today and would turn into a phantom 60-minute exercise «אימון רגליים».
  var HOURS_RX = new RegExp(
    '(?<![\\u0590-\\u05FF\\d.:\\/])(?<!(?:אחרי|לפני|תוך|כל|בעוד|מדי)\\s+)(?:' +
    '(שלושת\\s*רבעי|רבע|חצי|3\\/4|1\\/4|1\\/2|½|¼|¾)\\s*שעה' +
    '|(\\d{1,2}):([0-5]\\d)\\s*שע(?:ות|ה)' +
    '|(\\d(?:\\.\\d+)?)\\s*שע(?:ות|ה)' +
    '|(שעתיים|שעה(?:\\s+אחת)?)(?:\\s*(וחצי|ורבע)|\\s*ו?-?\\s*(\\d{1,2})\\s*' + MINUTE_UNIT + ')?' +
    ')(?![\\u0590-\\u05FF\\d]|\\s*\\d|\\s+(?:אחרי|לפני|קודם))', 'g');
  var TITLE_LINE_RX = /^[^\u0590-\u05FFa-zA-Z\d]*(?:אימון|תוכנית|תכנית|תרגול)(?![\u0590-\u05FF])/;

  function hoursToMinutes(m, frac, h, mm, num, word, part, plus) {
    var min;
    if (frac) min = /רבעי|3\/4|¾/.test(frac) ? 45 : /רבע|1\/4|¼/.test(frac) ? 15 : 30;
    else if (h) min = toInt(h) * 60 + toInt(mm);
    else if (num) min = Math.round(parseFloat(num) * 60);
    else {
      min = /שעתיים/.test(word) ? 120 : 60;
      if (part) min += part === 'וחצי' ? 30 : 15;
      else if (plus) min += toInt(plus);
    }
    return min + ' דקות';
  }

  function normalizeHours(text) {
    return String(text || '').split('\n').map(function (line) {
      if (!/שע(?:ה|ות|תיים)/.test(line)) return line;
      // A title line whose only digits are the hour phrase stays digit-free, so it stays a title.
      if (TITLE_LINE_RX.test(line) && !/\d/.test(line.replace(HOURS_RX, ''))) return line;
      return line.replace(HOURS_RX, hoursToMinutes);
    }).join('\n');
  }

  // «סקוואט 3 x 12 reps», «plank 3 x 30 sec», «פלאנק 30 sec», «squat 3 sets x 12 reps», «plank 30s»,
  // «run 5 min»: the English unit after a count is the Hebrew one (was a name «סקוואט reps» / «plank sec»
  // with 30 reps / «פלאנק 30 sec» of 10 invented reps / «squat 3 sets reps»). Only right after a digit,
  // and only a whole word: «3 sets» is not «3 s», «5 minimum» is not «5 min», «kg» / «km» stay.
  var ENGLISH_UNIT_RX = /(\d)\s*(?:(rep(?:etition)?s?)|(sec(?:ond)?s?)|(min(?:ute)?s?)|(sets?)|(rounds?))(?![a-zA-Z])|(\d)(s)(?![a-zA-Z])/gi;
  var ENGLISH_OF_RX = /(סטים|סבבים)\s+of\s+(?=\d)/gi;

  function normalizeEnglishUnits(text) {
    return String(text || '').replace(ENGLISH_UNIT_RX, function (m, d, rep, sec, min, sets, rounds, d2, s2) {
      if (s2) return d2 + ' שניות';
      return d + ' ' + (rep ? 'חזרות' : sec ? 'שניות' : min ? 'דקות' : sets ? 'סטים' : 'סבבים');
    }).replace(ENGLISH_OF_RX, '$1 של ');
  }

  // «סקוואט 3x10 מנוחה דקתיים», «דקתיים מנוחה», «פלאנק דקתיים וחצי»: «דקתיים» is two minutes,
  // but only the exercise line knew the word, so the rest was read as 120 s of work with no rest,
  // a rest line «מנוחה דקתיים» merged into the exercise above it, and «וחצי» stayed in the name.
  // Written out as «2 דקות» before anything reads the paste, the rest line and the defaults see it.
  var TWO_MINUTES_RX = /(^|[^֐-׿])דקתיים(?![֐-׿])/g;

  function normalizeTwoMinutes(text) {
    return text.replace(TWO_MINUTES_RX, '$12 דקות');
  }

  function ingestText(text, catalogOrList) {
    var raw = normalizeSetWords(normalizeEnglishUnits(normalizeHours(normalizeTwoMinutes(normalizeDecimalComma(normalizeTicks(stripEmoji(text))))))).trim();
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
    var blockNote = null;
    var prevInvented = false;
    // «ריצה קלה 5 דקות» above «3 סבבים:» is done once, not for every round.
    var roundsAt = tokens.indexOf(ROUNDS_MARK);
    var roundDefaults = defaults;
    if (roundsAt >= 0) defaults = Object.assign({}, defaults, { sets: null });
    var phase = 'Main';
    for (var i = 0; i < tokens.length; i++) {
      if (i === roundsAt) {
        defaults = roundDefaults;
        continue;
      }
      if (tokens[i].charAt(0) === PHASE_MARK) {
        phase = tokens[i].slice(1);
        blockNote = null;
        continue;
      }
      if (tokens[i].charAt(0) === BLOCK_MARK) {
        blockNote = tokens[i].slice(1);
        continue;
      }
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
        // Only an invented 10 gives way: «סקוואט 15, 20» keeps its own 15.
        if (prevInvented && (parsed.reps != null || parsed.duration_seconds != null)) {
          prev.reps = parsed.reps != null ? parsed.reps : null;
          prev.duration_seconds = parsed.duration_seconds != null ? parsed.duration_seconds : null;
          prevInvented = false;
        }
        continue;
      }
      prevInvented = parsed.countInvented;
      if (lastRest != null && parsed.rest_seconds == null) parsed.rest_seconds = lastRest;
      if (blockNote) parsed.notes = [blockNote, parsed.notes].filter(Boolean).join(' · ');
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
      parsed.phase = phase;
      exercises.push(parsed);
    }
    // «חימום:» with nothing that closes it would leave Main empty: the warm-up ends at its first
    // exercise of several sets («3x10 סקוואט»). Without one, the paste is all Main as before.
    if (!exercises.some(function (ex) { return ex.phase === 'Main'; })) {
      var warm = exercises.filter(function (ex) { return ex.phase === 'Warm-up'; });
      var cut = -1;
      warm.some(function (ex, k) { return ex.sets > 1 && (cut = k) >= 0; });
      warm.forEach(function (ex, k) { if (cut < 0 || k >= cut) ex.phase = 'Main'; });
      if (cut < 0) exercises.forEach(function (ex) { ex.phase = 'Main'; });
    }

    function phaseExercises(name) {
      return exercises.filter(function (ex) { return ex.phase === name; }).map(function (ex) {
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
      });
    }

    var workout = {
      title: 'אימון שנקלט',
      // «סה"כ 25 דקות» at the end of the paste is the workout's stated length, not an exercise;
      // so is «אימון 45 דקות» as the title when no total line states one.
      duration_minutes: totalMinutes(raw) != null ? totalMinutes(raw) : titleMinutes(raw, list),
      participants: 1,
      equipment: [],
      intensity: 'medium',
      tags: ['ingest'],
      phases: [
        { name: 'Warm-up', duration_minutes: 0, exercises: phaseExercises('Warm-up') },
        { name: 'Main', duration_minutes: null, exercises: phaseExercises('Main') },
        { name: 'Cool-down', duration_minutes: 0, exercises: phaseExercises('Cool-down') }
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
