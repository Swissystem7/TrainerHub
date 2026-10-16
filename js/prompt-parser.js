/**
 * Rule-based Hebrew prompt parser (no network, no API key).
 * Extracts muscle group, duration, equipment, participant count, level, and goal
 * from one free-text line.
 * Classic script. Namespace: window.THPrompt
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
  }

  var MUSCLE_KEYS = {
    core: ['בטן', 'ליבה', 'פלאנק', 'קראנץ', 'כפיפות בטן'],
    legs: ['רגליים', 'רגל', 'ירכיים', 'ארבע ראשי', 'סקוואט', 'מכרעים', 'ישבן', 'עכוז', 'גלוט', 'glute'],
    back: ['גב', 'חתירה', 'אוסטרלי'],
    chest: ['חזה', 'שכיבות'],
    shoulders: ['כתפיים', 'כתף'],
    biceps: ['דו ראשי', 'דו-ראשי', 'דו־ראשי', 'בייספס'],
    triceps: ['תלת ראשי', 'תלת-ראשי', 'תלת־ראשי', 'טרייספס'],
    arms: ['ידיים', 'יד', 'זרועות', 'זרוע']
  };

  // Short muscle words that are substrings of common unrelated words:
  // "גב" in "גבוהה" (עצימות גבוהה, ברכיים גבוהות), "יד" in "בעמידה" / "תמיד",
  // "רגל" in "כדורגל". These must match as whole words, optionally with a
  // ו/ב/ל/ה prefix ("וגב", "לגב"). "ליד" (next to) is deliberately excluded.
  var WHOLE_WORD_RX = {
    'גב': /(?:^|[^א-ת])[ובלה]{0,2}גב(?=$|[^א-ת])/,
    'יד': /(?:^|[^א-ת])[ובה]?יד(?=$|[^א-ת])/,
    'רגל': /(?:^|[^א-ת])[ובלה]{0,2}רגל(?=$|[^א-ת])/
  };

  // "פלג גוף עליון" / "גוף תחתון" / "חלק עליון" name a half of the body, not a
  // muscle. Without these the prompt fell through to the full-body default,
  // so an upper-body request came back titled «אימון גוף מלא» and filled with
  // crunch variants. The word must follow גוף/פלג/חלק: «פולי עליון» (the lat
  // pulldown) is a back exercise, not a half-body request.
  var UPPER_BODY_RX = /(?:פלג|חלק|גוף)[ -]?(?:ה?גוף[ -]?)?ה?עליון|upper.?body/;
  var LOWER_BODY_RX = /(?:פלג|חלק|גוף)[ -]?(?:ה?גוף[ -]?)?ה?תחתון|lower.?body/;
  var UPPER_MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];
  var LOWER_MUSCLES = ['legs'];

  function hasMuscleWord(t, word) {
    var rx = WHOLE_WORD_RX[word];
    if (rx) return rx.test(t);
    return t.indexOf(Infer.fold(word)) !== -1;
  }

  function toInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  // Minutes written as Hebrew number words: "עשרים דקות", "ארבעים וחמש דקות",
  // "חמש עשרה דקות". Up to two words right before דק/דקות, like the
  // participant words. A non-number word ("כמה דקות") gives null.
  var MINUTE_WORDS = '((?:[א-ת]+ )?[א-ת]+) דק';
  var MINUTE_WORDS_RX = new RegExp('(?:^|[^א-ת])' + MINUTE_WORDS);
  var HOUR_PLUS_MINUTE_WORDS_RX = new RegExp('שעה ו' + MINUTE_WORDS);
  var TWO_HOURS_PLUS_MINUTE_WORDS_RX = new RegExp('שעתיים ו' + MINUTE_WORDS);

  function minuteWords(t, rx) {
    var m = t.match(rx);
    if (!m) return null;
    var n = hebrewNumber(m[1]);
    // "אימון של עשר דקות": the first word is not a number, the second is.
    if (n === null) n = hebrewNumber(m[1].split(' ').pop());
    return n !== null && n > 0 ? n : null;
  }

  // A clock time is not a duration: "בשעה 17:00", "משעה 4 עד 5", "השעה 9",
  // "עד שעה 18:30". The phrase is removed before the hour regexes run, so
  // "אימון של שעה בשעה 18:00" still keeps its real hour. "עד שעה" with no
  // digits stays (up to an hour), and "שעה 20 דקות" is not a clock time.
  var CLOCK_TIME_RX = /(?:^|[^א-ת])ו?(?:ב|מ|ה|עד |עד ה|לפני ה|אחרי ה)שעה\s*\d{1,2}(?:[:.]\d{2})?(?!\d|\s*דק)|שעה\s*\d{1,2}[:.]\d{2}/g;

  function stripClockTimes(t) {
    return t.replace(CLOCK_TIME_RX, ' ');
  }

  // Hebrew hour phrases. Checked before the bare minute regex so that
  // "שעה ו-15 דקות" is 75 minutes and not just the trailing "15 דקות".
  function parseDuration(text) {
    var t = stripClockTimes(Infer.fold(String(text || '')));
    var m;
    var n;
    if (/שעתיים/.test(t)) {
      m = t.match(/שעתיים\s*ו[\s-]*(\d+)\s*דק/);
      if (m) return 120 + toInt(m[1]);
      n = minuteWords(t, TWO_HOURS_PLUS_MINUTE_WORDS_RX);
      if (n !== null) return 120 + n;
      if (/שעתיים\s*וחצי/.test(t)) return 150;
      if (/שעתיים\s*ורבע/.test(t)) return 135;
      return 120;
    }
    // Digit hours: "2 שעות", "3 שעות ו-20 דקות", "1.5 שעות", "2 שעות וחצי".
    // Checked before "שעה ו" so the hours are not lost to the trailing minutes.
    // The singular is common with a fraction: "1.5 שעה" is 90 and "3/4 שעה"
    // is 45, not the bare-"שעה" 60.
    m = t.match(/(\d+)\s*\/\s*(\d+)\s*(?:שעות|שעה)/);
    if (m && toInt(m[2]) > 0) {
      n = Math.round(toInt(m[1]) / toInt(m[2]) * 60);
      if (n > 0) return n;
    }
    if (/½\s*(?:שעות|שעה)/.test(t)) return 30;
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:שעות|שעה)/);
    if (m) {
      n = Math.round(parseFloat(m[1].replace(',', '.')) * 60);
      if (n > 0) {
        var extra = t.match(/(?:שעות|שעה)\s*ו[\s-]*(\d+)\s*דק/);
        if (extra) return n + toInt(extra[1]);
        if (/(?:שעות|שעה)\s*וחצי/.test(t)) return n + 30;
        if (/(?:שעות|שעה)\s*ורבע/.test(t)) return n + 15;
        return n;
      }
    }
    m = t.match(/שעה\s*ו[\s-]*(\d+)\s*דק/);
    if (m) return 60 + toInt(m[1]);
    n = minuteWords(t, HOUR_PLUS_MINUTE_WORDS_RX);
    if (n !== null) return 60 + n;
    if (/שעה\s*וחצי/.test(t)) return 90;
    if (/שעה\s*ורבע/.test(t)) return 75;
    m = t.match(/(\d+)\s*דק/);
    if (m) return toInt(m[1]);
    n = minuteWords(t, MINUTE_WORDS_RX);
    if (n !== null) return n;
    // "שלושת רבעי שעה" / "שלוש רבעי שעה" = 45 minutes.
    if (/שלושת?\s*רבעי\s*שעה/.test(t)) return 45;
    if (/חצי\s*שעה/.test(t)) return 30;
    if (/רבע\s*שעה/.test(t)) return 15;
    if (/שעה(?!\s*ו)/.test(t) && !/חצי|רבע/.test(t)) return 60;
    m = t.match(/(\d+)\s*min/i);
    if (m) return toInt(m[1]);
    return null;
  }

  // "איש" (20 איש), "בנים"/"בנות" and "נערים"/"נערות" must end at a word
  // boundary: "אימון אישי", "אישור" and "אישה" are not head counts.
  // Soldiers, pupils, students, athletes, fighters, men and women are trainees
  // too: "אימון ל-15 חיילים" is fifteen people, not one.
  var PARTICIPANT_TERM = '(?:חניכ(?:ים|ות)?|מתאמנ(?:ים|ות)?|משתתפ(?:ים|ות)?|ילד(?:ים|ות)?|אנשים|(?:איש|בנ(?:ים|ות)|נער(?:ים|ות)|חייל(?:ים|ות)|תלמיד(?:ים|ות|י)|סטודנט(?:ים|יות)|ספורטא(?:ים|יות)|לוחמ(?:ים|ות)|נשים|גברים)(?=$|[^א-ת])|שחקנ(?:ים|יות)?|participants?|athletes?|players?)';
  var DIGITS_BEFORE_TERM = new RegExp('(\\d+)\\s*' + PARTICIPANT_TERM, 'i');
  // Up to two Hebrew words right before the participant term ("שלוש עשרה חניכות",
  // "עשרים וחמישה מתאמנים"). Only a space may separate them.
  var WORDS_BEFORE_TERM = new RegExp('(?:^|[^א-ת])((?:[א-ת]+ )?[א-ת]+) ' + PARTICIPANT_TERM, 'i');
  var GROUP_OF_DIGITS = /(?:קבוצה|כיתה)\s*(?:של|עם)?\s*(\d+)/;
  var GROUP_OF_WORDS = /(?:קבוצה|כיתה) (?:של |עם )?((?:[א-ת]+ )?[א-ת]+)(?=$|[^א-ת])/;
  // "3 קבוצות של 5" / "שלוש קבוצות של חמישה" is 15 trainees, not the 5 of one
  // group. Each side is digits or one Hebrew number word.
  var GROUPS_OF_RX = /(?:^|[^א-ת])(\d+|[א-ת]+)\s*קבוצות\s*(?:של|עם)\s*(\d+|[א-ת]+)(?!\s*(?:דק|שנ|סיבוב|סבב|תרגיל|חזר))(?=$|[^א-ת\d])/;
  // "5 זוגות" / "חמישה זוגות" is 10 trainees, "3 שלשות" is 9. Only a bare
  // unit word counts: "בזוגות" (working in pairs) has no space before זוגות,
  // so it never matches here and stays the plain "זוג" fallback.
  var GROUP_UNIT_SIZE = { 'זוגות': 2, 'שלשות': 3, 'רביעיות': 4 };
  var GROUP_UNIT = '(זוגות|שלשות|רביעיות)(?=$|[^א-ת])';
  var DIGITS_BEFORE_UNIT = new RegExp('(\\d+)\\s*' + GROUP_UNIT);
  var WORDS_BEFORE_UNIT = new RegExp('(?:^|[^א-ת])((?:[א-ת]+ )?[א-ת]+) ' + GROUP_UNIT);

  // Hebrew number words, masculine and feminine, 1-10 plus the tens.
  // "שנים"/"שתים" only appear in 12 ("שנים עשר", "שתים עשרה").
  var HEB_UNITS = {
    'אחד': 1, 'אחת': 1,
    'שני': 2, 'שניים': 2, 'שתי': 2, 'שתיים': 2, 'שנים': 2, 'שתים': 2,
    'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4,
    'חמישה': 5, 'חמש': 5,
    'שישה': 6, 'שש': 6,
    'שבעה': 7, 'שבע': 7,
    'שמונה': 8,
    'תשעה': 9, 'תשע': 9,
    'עשרה': 10, 'עשר': 10
  };
  var HEB_TENS = {
    'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50,
    'שישים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90
  };

  // Strip one ל/ב/כ prefix ("לשמונה חניכים") when the rest is a number word.
  function unitValue(word) {
    if (HEB_UNITS.hasOwnProperty(word)) return HEB_UNITS[word];
    if (/^[לבכ]/.test(word) && HEB_UNITS.hasOwnProperty(word.slice(1))) return HEB_UNITS[word.slice(1)];
    return null;
  }

  function tensValue(word) {
    if (HEB_TENS.hasOwnProperty(word)) return HEB_TENS[word];
    if (/^[לבכ]/.test(word) && HEB_TENS.hasOwnProperty(word.slice(1))) return HEB_TENS[word.slice(1)];
    return null;
  }

  // Turns "שמונה", "שלוש עשרה", "שנים עשר", "עשרים וחמישה" into a number.
  // A feminine teen ("שלוש עשרה") must give 13, not the trailing "עשרה" (10).
  function hebrewNumber(phrase) {
    var words = String(phrase || '').split(' ').filter(Boolean);
    var last = words[words.length - 1];
    var first = words.length === 2 ? words[0] : null;
    var unit, tens;
    if (first !== null) {
      unit = unitValue(first);
      if (unit !== null && unit < 10 && (last === 'עשר' || last === 'עשרה')) return 10 + unit;
      tens = tensValue(first);
      if (tens !== null && /^ו/.test(last)) {
        unit = unitValue(last.slice(1));
        if (unit !== null && unit < 10) return tens + unit;
      }
    }
    unit = unitValue(last);
    if (unit !== null) return unit;
    tens = tensValue(last);
    if (tens !== null) return tens;
    return null;
  }

  // Number of trainees in "N זוגות" / "N שלשות" / "N רביעיות", or null.
  function groupUnitCount(t) {
    var m = t.match(DIGITS_BEFORE_UNIT);
    var n = null;
    if (m) {
      n = toInt(m[1]);
    } else {
      m = t.match(WORDS_BEFORE_UNIT);
      if (!m) return null;
      // hebrewNumber reads the last word when the first is not a number,
      // so "אימון של שלושה זוגות" gives 3 here.
      n = hebrewNumber(m[1]);
    }
    if (n === null || n <= 0) return null;
    return n * GROUP_UNIT_SIZE[m[2]];
  }

  // "זוג משקולות" / "זוג דמבלים" / "זוג גומיות" is a pair of equipment, not a
  // couple: neither a head count nor a partner workout. The phrase is blanked
  // out before the "זוג" checks so a solo trainee with two dumbbells does not
  // get a session of partner drills.
  var PAIR_OF_GEAR_RX = /זוג(?:ות)?\s+(משקולות|משקוליות|משקולת|דאמבלים|דמבלים|דאמבל|דמבל|גומיות|גומיה|קטלבלים|קטלבל)(?=$|[^א-ת])/g;

  function withoutGearPairs(t) {
    return t.replace(PAIR_OF_GEAR_RX, ' ');
  }

  // Trainees in "N קבוצות של M", or null.
  function groupsOfCount(t) {
    var m = t.match(GROUPS_OF_RX);
    if (!m) return null;
    var groups = /^\d+$/.test(m[1]) ? toInt(m[1]) : hebrewNumber(m[1]);
    var size = /^\d+$/.test(m[2]) ? toInt(m[2]) : hebrewNumber(m[2]);
    if (!groups || !size || groups <= 0 || size <= 0) return null;
    return groups * size;
  }

  function parseParticipants(text) {
    var t = withoutGearPairs(Infer.fold(String(text || '')));
    // "3 קבוצות של 5 חניכים" counts every group, so it runs before the
    // per-term count that would read just the 5.
    var groups = groupsOfCount(t);
    if (groups !== null) return Math.min(groups, 500);
    // An explicit count wins over "זוג": "20 חניכים בזוגות" is a group of 20
    // working in pairs, not a couple. "זוג" alone (no number) still means 2.
    var n = null;
    var m = t.match(DIGITS_BEFORE_TERM);
    if (!m) m = t.match(GROUP_OF_DIGITS);
    if (m) {
      n = toInt(m[1]);
    } else {
      // Number words: "שמונה חניכים", "שלוש עשרה חניכות", "קבוצה של עשרה".
      m = t.match(WORDS_BEFORE_TERM);
      if (m) n = hebrewNumber(m[1]);
      if (n === null) {
        m = t.match(GROUP_OF_WORDS);
        if (m) n = hebrewNumber(m[1]);
        // "קבוצה של שמונה בזוגות": the number is the first word, not the last.
        if (m && n === null) n = hebrewNumber(m[1].split(' ')[0]);
      }
      // "5 זוגות" / "שלושה זוגות": a count of pairs (or triples) is multiplied
      // by the unit size. Runs after the trainee words so "10 חניכים בזוגות"
      // keeps its explicit 10.
      if (n === null) n = groupUnitCount(t);
    }
    // "זוג משקולות" was blanked out above, so a bare "זוג" here is a couple.
    if (n === null) return /זוג/.test(t) ? 2 : null;
    return n && n > 0 ? Math.min(n, 500) : null;
  }

  // "רמה גבוהה" / "רמה נמוכה" / "רמה בסיסית" describe the trainees' level.
  // A bare "גבוהה" does not: "עצימות גבוהה" and "ברכיים גבוהות" are drills.
  var LEVEL_HIGH_RX = /רמה גבוהה|ברמה הגבוהה|רמה מאוד גבוהה|רמה גבוהה מאוד/;
  var LEVEL_LOW_RX = /רמה נמוכה|ברמה הנמוכה|רמה בסיסית|רמה התחלתית|חניכ(?:ים|ות) חדש(?:ים|ות)|מתאמנ(?:ים|ות) חדש(?:ים|ות)/;

  // "לא מתקדמים" / "לא למתקדמים" / "בלי מתחילים" / "לא ברמה גבוהה" rules that
  // level out. The negated phrase is cut before the checks below, so «אימון
  // למתחילים לא מתקדמים» is a beginner session, not an advanced one.
  var NEGATED_LEVEL_RX = /(?:^|\s)(?:לא|ללא|בלי)\s+(?:(?:ה|ל|ב|של)?(?:מתקדמ|מתחיל|ביניים|בינוני)[^\s,]*|(?:ב|ל)?רמה\s+[^\s,]+(?:\s+מאוד)?)|\bnot\s+(?:for\s+)?(?:advanced|beginners?|intermediate)\b/g;

  function parseLevel(text) {
    var t = Infer.fold(text).replace(NEGATED_LEVEL_RX, ' ');
    if (/מתקדמ|advanced/.test(t) || LEVEL_HIGH_RX.test(t)) return 'advanced';
    // "רמה בינונית" / "בינוניים" is intermediate too, but "קצב בינוני",
    // "משקל בינוני" and "עצימות בינונית" describe the load, not the trainees.
    if (/ביניים|בינים|(?<!(?:קצב|משקל|עומס|עצימות|מנוחה) )בינוני|intermediate/.test(t)) return 'intermediate';
    if (/מתחיל|beginner/.test(t) || LEVEL_LOW_RX.test(t)) return 'beginner';
    return null;
  }

  // "לא כוח" / "בלי קרדיו" / "not strength" rules the goal out. A negated
  // phrase (and words joined to it with ו־) is cut only when it names a goal,
  // so «אימון סיבולת, לא כוח» is an endurance session, not a strength one.
  var NEGATED_GOAL_RX = /(?:^|\s)ו?(?:לא|בלי|ללא)\s+[^\s,]+(?:\s+ו[^\s,]+)*|\b(?:not|no)\s+[a-z]+(?:\s+(?:and|or)\s+[a-z]+)*/g;
  var GOAL_WORD_RX = /כוח|strength|היפרטרופ|מסת|muscle|סיבולת|סבולת|אירובי|קרדיו|endurance|cardio/;

  function withoutNegatedGoals(t) {
    return t.replace(NEGATED_GOAL_RX, function (phrase) {
      return GOAL_WORD_RX.test(phrase) ? ' ' : phrase;
    });
  }

  function parseGoal(text) {
    var t = withoutNegatedGoals(Infer.fold(text));
    if (/כוח|strength/.test(t) && !/חיזוק/.test(t)) return 'strength';
    if (/חיזוק כוח/.test(t)) return 'strength';
    // "muscular endurance" names a muscle but is an endurance goal.
    if (/muscular endurance/.test(t)) return 'endurance';
    if (/היפרטרופ|מסת שריר|muscle/.test(t)) return 'hypertrophy';
    // Both spellings, "סיבולת" and the app's own "סבולת" (analyzer, README).
    // "אירובי" / "קרדיו" ask for the same stimulus: high reps, short rests.
    if (/סיבולת|סבולת|אירובי|קרדיו|endurance|cardio/.test(t)) return 'endurance';
    if (/ליבה|ייצוב|core/.test(t) && /מטרה|גירוי/.test(t)) return 'core';
    return null;
  }

  // "בלי משקולות" / "ללא גומיות ומשקולות" rules the gear out. The negated words
  // (and any joined to them with ו־) are cut before inferring, so «אימון רגליים
  // בלי משקולות» is not a dumbbell request that matches no clip.
  var NEGATED_GEAR_RX = /(?:^|\s)(?:בלי|ללא)\s+(?:שום\s+)?[^\s,]+(?:\s+ו[^\s,]+)*/g;

  function parseEquipment(text) {
    var t = Infer.fold(text);
    if (/בלי ציוד|ללא ציוד|בלי שום ציוד|משקל גוף|bodyweight/.test(t)) return ['none'];
    var negated = t.match(NEGATED_GEAR_RX);
    var ruledOut = negated && Infer.inferEquipment(negated.join(' '))[0] !== 'none';
    if (negated) t = t.replace(NEGATED_GEAR_RX, ' ');
    var inferred = Infer.inferEquipment(t);
    if (inferred.length === 1 && inferred[0] === 'none') {
      if (/עם גומי|גומיות|גומייה/.test(t)) return ['band'];
      if (/עם קונוס|קונוסים/.test(t)) return ['cones'];
      if (/עם כדור/.test(t)) return ['ball'];
      return ruledOut ? ['none'] : [];
    }
    return inferred;
  }

  function parseAudience(text) {
    var t = withoutGearPairs(Infer.fold(text));
    if (/ילד/.test(t)) return 'kids';
    if (/זוג|פרטנר/.test(t)) return 'partner';
    if (/ספורט|כדורגל|כדורסל/.test(t)) return 'sport';
    return '';
  }

  // "לא לרגליים" / "בלי בטן" / "ללא רגליים ובטן" rules the muscle out. A
  // negated phrase (and words joined to it with ו־) is cut only when it names
  // a muscle, so «אימון לא לרגליים, רק ידיים» is an arm session, not a leg
  // one, while «לא יותר מ 20 דקות» and «בלי משקולות» stay as they are.
  var NEGATED_MUSCLE_RX = /(?:^|\s)(?:לא|בלי|ללא)\s+[^\s,]+(?:\s+ו[^\s,]+)*/g;

  function namesMuscle(t) {
    return Object.keys(MUSCLE_KEYS).some(function (key) {
      return MUSCLE_KEYS[key].some(function (word) { return hasMuscleWord(t, word); });
    }) || Infer.mentionsPullUp(t);
  }

  function withoutNegatedMuscles(t) {
    return t.replace(NEGATED_MUSCLE_RX, function (phrase) {
      return namesMuscle(phrase) ? ' ' : phrase;
    });
  }

  // The muscle groups the negated phrases name. A prompt that only rules
  // muscles out («אימון בלי רגליים») falls back to full body, and without this
  // list the full-body session still filled with leg clips.
  function negatedMuscles(t) {
    var out = [];
    (t.match(NEGATED_MUSCLE_RX) || []).forEach(function (phrase) {
      Object.keys(MUSCLE_KEYS).forEach(function (key) {
        if (!MUSCLE_KEYS[key].some(function (word) { return hasMuscleWord(phrase, word); })) return;
        if (key === 'arms') out.push('biceps', 'triceps');
        else out.push(key);
      });
    });
    return Infer.uniq(out);
  }

  function parseMuscles(text) {
    var folded = Infer.fold(text);
    var excluded = negatedMuscles(folded);
    var t = withoutNegatedMuscles(folded);
    var muscles = [];
    var focus = null;
    if (/פול.?בודי|פול בודי|גוף מלא|full.?body|כל הגוף/.test(t)) {
      return { muscles: [], focus: 'full', excluded: excluded };
    }
    if (UPPER_BODY_RX.test(t)) {
      muscles = muscles.concat(UPPER_MUSCLES);
      focus = 'upper';
    }
    if (LOWER_BODY_RX.test(t)) {
      muscles = muscles.concat(LOWER_MUSCLES);
      if (!focus) focus = 'lower';
    }
    Object.keys(MUSCLE_KEYS).forEach(function (key) {
      MUSCLE_KEYS[key].forEach(function (word) {
        if (hasMuscleWord(t, word)) {
          if (key === 'arms') {
            muscles.push('biceps', 'triceps');
            if (!focus) focus = 'arms';
          } else {
            muscles.push(key);
            if (!focus) focus = key;
          }
        }
      });
    });
    if (Infer.mentionsPullUp(t)) {
      muscles.push('back', 'biceps');
      if (!focus) focus = 'back';
    }
    muscles = Infer.uniq(muscles);
    return { muscles: muscles, focus: focus || (muscles.length ? muscles[0] : 'full'), excluded: excluded };
  }

  function parsePrompt(text) {
    var raw = String(text || '').trim();
    var muscleInfo = parseMuscles(raw);
    var duration = parseDuration(raw);
    var participants = parseParticipants(raw);
    var equipment = parseEquipment(raw);
    var level = parseLevel(raw);
    var goal = parseGoal(raw);
    var audience = parseAudience(raw);
    return {
      raw: raw,
      muscles: muscleInfo.muscles,
      focus: muscleInfo.focus || 'full',
      excludedMuscles: muscleInfo.excluded,
      duration: duration || 20,
      durationSpecified: duration != null,
      participants: participants || 1,
      participantsSpecified: participants != null,
      equipment: equipment,
      level: level,
      goal: goal,
      audience: audience,
      tokens: raw ? Infer.fold(raw).split(' ').filter(Boolean) : []
    };
  }

  var api = {
    parsePrompt: parsePrompt,
    parseDuration: parseDuration,
    parseParticipants: parseParticipants,
    parseLevel: parseLevel,
    parseGoal: parseGoal,
    parseEquipment: parseEquipment
  };

  root.THPrompt = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
