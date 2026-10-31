/**
 * Rule-based free-text workout parser (no AI).
 * Produces the same phases JSON schema as backend/main.py so Creator Studio
 * works on GitHub Pages when localhost:8001 is unreachable.
 */
(function (root) {
  'use strict';

  var PHASE_NAMES = { warmup: 'Warm-up', main: 'Main', cooldown: 'Cool-down' };

  function toInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  var PEOPLE = '(?:אנשים|איש|משתתפים|משתתפות|חניכים|חניכות|מתאמנים|מתאמנות|ילדים|ילדות|נערים|נערות|בני\\s*נוער|לקוחות|ספורטאים|ספורטאיות)';
  var PEOPLE_END = '(?=\\s|$|[,.;:)])';
  var PARTICIPANTS_RX = new RegExp('(\\d+)\\s*' + PEOPLE + PEOPLE_END);
  var PARTICIPANTS_LABEL_RX = new RegExp('^(?:מספר\\s+)?' + PEOPLE + '\\s*:?\\s*(\\d+)');
  var PARTICIPANTS_LINE_RX = new RegExp('^(?:(?:מספר\\s+)?' + PEOPLE + '\\s*:?\\s*\\d+|(?:ל-?\\s*|(?:ל)?קבוצה של\\s*)?\\d+\\s*' + PEOPLE + ')[.]?$');
  // «ל-12 חניכים», «לקבוצה של 8 מתאמנים», «עבור 10 משתתפים» in a title.
  var PARTICIPANTS_TITLE_RX = new RegExp('(?:^|,?\\s+)(?:ל-?\\s*|(?:עבור|של)\\s+|(?:ל)?קבוצה של\\s*)?\\d+\\s*' + PEOPLE + PEOPLE_END);

  function classifyPhase(line) {
    var t = String(line || '').trim();
    // Do not use \b after Hebrew — JS word boundaries are ASCII-only.
    if (/^חימום(?:\s|:|$)/i.test(t) || /^warm[-\s]?up\b/i.test(t)) return PHASE_NAMES.warmup;
    if (/^שחרור(?:\s|:|$|\.)/i.test(t) || /^cool[-\s]?down\b/i.test(t)) return PHASE_NAMES.cooldown;
    if (/^(?:חלק\s+)?עיקר(?:י|ית)?(?:\s|:|$|[\-–])/i.test(t) || /^main\b/i.test(t)) return PHASE_NAMES.main;
    return null;
  }

  // «פלאנק 30"», «בורפי 3x40״», «45''»: a double prime after a number is seconds, the way
  // trainers type it, so it reads as «30 שניות» everywhere below. A lone «'» is left alone.
  function quoteSeconds(text) {
    return String(text || '').replace(/(\d)\s?(?:''|["״])(?![֐-׿A-Za-z\d])/g, '$1 שניות');
  }

  // «5 דקות», «1.5 דקות», «2 דקות וחצי», «2-3 דקות», «דקתיים», «דקה וחצי», «חצי דקה», «דקה» -> seconds.
  // `lead` is a pattern that must come right before the amount («מנוחה של »),
  // `tail` one that must come right after it («דקה מנוחה»).
  function minutesPhrase(text, lead, tail) {
    var s = String(text || '');
    var end = '(?=\\s|$|[,.;:])' + (tail || '');
    var word = lead || '(?:^|\\s)';
    // «2-3 דקות» is a range: the lower bound, the way the rest of the parser reads ranges.
    var m = s.match(new RegExp((lead || '') + '(?:(\\d+)\\s*[-–]\\s*)?(\\d+(?:[.,]\\d+)?)\\s*דק(?:ות|ה|[׳\'])?(\\s*וחצי)?' + end));
    if (m) {
      var minutes = parseFloat((m[1] || m[2]).replace(',', '.')) + (m[3] ? 0.5 : 0);
      return { match: m[0], seconds: Math.round(minutes * 60) };
    }
    m = s.match(new RegExp(word + 'דקתיים(\\s*וחצי)?' + end));
    if (m) return { match: m[0], seconds: m[1] ? 150 : 120 };
    m = s.match(new RegExp(word + 'דקה\\s*וחצי' + end));
    if (m) return { match: m[0], seconds: 90 };
    m = s.match(new RegExp(word + 'חצי\\s*דקה' + end));
    if (m) return { match: m[0], seconds: 30 };
    m = s.match(new RegExp(word + 'דקה' + end));
    if (m) return { match: m[0], seconds: 60 };
    return null;
  }

  // «מנוחה 60 שניות», «מנוחה של 2 דקות», «מנוחה 90», «מנוחה דקה», «מנוחה חצי דקה», «20 שניות מנוחה»,
  // «דקה מנוחה», «2 דקות מנוחה», «מנוחה 1.5» (minutes - nobody rests 1.5 seconds).
  function restPhrase(text) {
    var s = String(text || '');
    var minutes = minutesPhrase(s, 'מנוחה\\s*(?:של\\s*)?');
    if (minutes) return minutes;
    var m = s.match(/מנוחה\s*(?:של\s*)?(\d+[.,]\d+)(?=\s|$|[,;:]|\.(?!\d))/);
    if (m) return { match: m[0], seconds: Math.round(parseFloat(m[1].replace(',', '.')) * 60) };
    // «מנוחה 30-45 שניות» / «30-45 שניות מנוחה» rest the lower bound; the upper one is not left in the name.
    m = s.match(/מנוחה\s*(?:של\s*)?(\d+)(?![.,]\d)(?:\s*[-–]\s*\d+)?\s*(?:שניות|שנ[׳']|″)?/);
    if (m) return { match: m[0], seconds: toInt(m[1]) };
    m = s.match(/(?:(\d+)\s*[-–]\s*)?(\d+)\s*(?:שניות|שנ[׳']|″)\s*מנוחה/);
    if (m) return { match: m[0], seconds: toInt(m[1] || m[2]) };
    // «פלאנק דקה מנוחה» is still a minute of plank; the minutes are the rest only
    // when nothing or another amount comes before them («סקוואט 3x12 2 דקות מנוחה»).
    var before = minutesPhrase(s, '', '\\s*מנוחה');
    if (!before) return null;
    var lead = s.slice(0, s.indexOf(before.match)).trim();
    if (!lead || /(?:\d|חזרות|סטים|סט|שניות|שנ[׳']|דקות|דקה|פעמים|,)\s*[,.;:\-–]?$/.test(lead)) return before;
    return null;
  }

  // A line that only states the rest («מנוחה 30 שניות בין תרגילים», «40 שניות עבודה
  // 20 שניות מנוחה») sets the rest of the whole session. On an exercise line
  // («סקוואט 3x12 מנוחה 60 שניות») the rest belongs to that exercise alone.
  function isRestOnlyLine(line) {
    var rest = restPhrase(line);
    if (!rest) return false;
    var left = String(line).replace(rest.match, ' ')
      .replace(/\d+\s*(?:שניות|שנ[׳']|″)\s*עבודה/g, ' ')
      .replace(/(?:^|\s)(?:בין|אחרי|לכל|כל|ה?תחנות|ה?סטים|ה?תרגילים|ה?סבבים|תחנה|תרגיל|סט|סבב)(?=\s|$|[,.;:])/g, ' ')
      .replace(/[\s,.;:\-–()]+/g, '');
    return !left;
  }

  function isSessionMeta(line) {
    if (isRestOnlyLine(line)) return true;
    if (PARTICIPANTS_LINE_RX.test(line)) return true;
    // A timed activity may contain instructions about rests or stations.
    if (/\d+\s*(?:שניות|שנ[׳']|″)/.test(line) && !/^מנוחה|^\d+\s*סבבים/.test(line)) return false;
    return (
      /^(?:(?:בצעו|לבצע|חזרו|לחזור|הכל|הכול)\s+)?\d+\s*סבבים/.test(line) ||
      /^(?:סך הכול|סה״כ|סה"כ)/.test(line) ||
      /חזור על הסבב/.test(line) ||
      /בין (תחנות|סטים|תרגילים)/.test(line) ||
      /ללא ציוד/.test(line) ||
      /ציוד\s*:/.test(line)
    ) && !/תחנה|תרגיל/.test(line);
  }

  // "מנוחה", "מנוחה דקה", "חזור 3 פעמים" are instructions, not exercises.
  // \b is ASCII-only in JS, so a Hebrew word followed by a space or the end
  // of the line is never a "word boundary"; spell the boundary out instead.
  function isRestOrRepeatLine(line) {
    return /^(?:מנוחה|חזור|חזרו)(?:\s|$|[:.,\-–\d])/.test(String(line || ''));
  }

  // «שעה», «שעה וחצי», «שעתיים», «1.5 שעות», «חצי שעה», «רבע שעה» -> minutes.
  function hoursPhrase(text) {
    var m = String(text || '').match(/(?:^|\s)(?:(\d+(?:[.,]\d+)?)\s*שעות?|(שלושת\s*רבעי|רבע|חצי)\s*שעה|(שעתיים|שעה)(\s*ו(?:חצי|רבע))?)(?=\s|$|[,.;:])/);
    if (!m) return null;
    var hours;
    if (m[1]) hours = parseFloat(m[1].replace(',', '.'));
    else if (m[2]) hours = /רבע/.test(m[2]) ? (/שלושת/.test(m[2]) ? 0.75 : 0.25) : 0.5;
    else hours = (m[3] === 'שעתיים' ? 2 : 1) + (m[4] ? (/חצי/.test(m[4]) ? 0.5 : 0.25) : 0);
    return { index: m.index, minutes: Math.round(hours * 60) };
  }

  // «3 סבבים של 5 דקות» / «4 סבבים x 3 דקות» are minutes per round, not the session.
  var PER_ROUND_LEAD = '\\d+\\s*(?:סבבים|סבב|סיבובים|סטים)\\s*(?:של\\s*|[x×*]\\s*)';

  // «חימום 2.5 דקות» is 2.5 minutes and «אימון של שעה» 60, not 5 and 30.
  // «אימון 3 סבבים של 5 דקות» is 15, and «4 סבבים של 3 דקות, 40 דקות» 40.
  function parseDurationMinutes(text) {
    var s = String(text || '');
    var per = minutesPhrase(s, PER_ROUND_LEAD);
    if (per) {
      var rest = s.replace(per.match, ' ');
      var other = parseDurationMinutes(rest);
      if (other) return other;
      return toInt(per.match.match(/\d+/)[0]) * per.seconds / 60;
    }
    var min = minutesPhrase(s);
    var hour = hoursPhrase(s);
    if (hour && (!min || hour.index < s.indexOf(min.match))) return hour.minutes;
    return min ? min.seconds / 60 : null;
  }

  // The header says «ל-12 חניכים» / «15 משתתפים» / «8 מתאמנים», or a line of
  // its own says «משתתפים: 12». An exercise line («מסירות בין 3 חניכים») is not
  // the group size, so these words count only on the first line and on
  // participant-only lines; «N אנשים» / «קבוצה של N» are read anywhere, as before.
  function parseParticipants(text) {
    var lines = String(text).split(/\r?\n/).map(function (l) { return l.trim(); });
    for (var i = 0; i < lines.length; i++) {
      if (i > 0 && !PARTICIPANTS_LINE_RX.test(lines[i])) continue;
      var m = lines[i].match(PARTICIPANTS_RX) || lines[i].match(PARTICIPANTS_LABEL_RX);
      if (m) return toInt(m[1]);
    }
    m = String(text).match(/(\d+)\s*אנשים/) || String(text).match(/קבוצה של\s*(\d+)/);
    return m ? toInt(m[1]) : null;
  }

  function parseEquipment(text) {
    if (/ללא ציוד/.test(text)) return [];
    var m = String(text).match(/ציוד\s*:\s*([^\n.]+)/);
    if (!m) return [];
    return m[1]
      .split(/,\s*| ו-/)
      .map(function (s) { return s.replace(/^ו/, '').trim(); })
      .filter(function (s) { return s.length > 1; });
  }

  function parseIntensity(text) {
    if (/עצימות גבוהה|HIIT|(?:^|\s)אש(?=\s|$|[,.!])|בורפי/.test(text)) return 'high';
    if (/עצימות נמוכה|מתחילים/.test(text)) return 'low';
    return 'medium';
  }

  function parseTags(text) {
    var tags = [];
    if (/HIIT|אינטרוול/.test(text)) tags.push('cardio');
    if (/כוח|סטים של/.test(text)) tags.push('strength');
    if (/פונקציונל/.test(text)) tags.push('functional');
    if (/קבוצה|אנשים/.test(text) || parseParticipants(text)) tags.push('group');
    if (/ללא ציוד|ביתי/.test(text)) tags.push('bodyweight');
    if (/ריצה/.test(text)) tags.push('cardio');
    return tags.length ? tags : ['general'];
  }

  function cleanTitle(firstLine, fallback) {
    var t = String(firstLine || '')
      .replace(/,?\s*\d+(?:[.,]\d+)?\s*דקות?.*/i, '')
      .replace(/(?:^|,?\s+)(?:דקה\s*וחצי|חצי\s*דקה|דקה)(?=\s|$|[,.;:]).*/, '')
      .replace(/\s+(?:של|[x×*])$/, '')
      .replace(/(?:^|,?\s+)(?:של\s*)?(?:\d+(?:[.,]\d+)?\s*שעות?|(?:שלושת\s*רבעי|רבע|חצי)\s*שעה|שעתיים|שעה)(?=\s|$|[,.;:]).*/, '')
      .replace(/,?\s*ציוד:.*/i, '')
      .replace(/,?\s*ללא ציוד.*/i, '')
      .replace(/,?\s*עצימות.*/i, '')
      .replace(/לקבוצה של\s*\d+\s*אנשים/i, '')
      .replace(PARTICIPANTS_TITLE_RX, '')
      .replace(/,?\s*לקבוצה של\s*\d+(?=\s|$|[,.;:])/, '')
      .replace(/[.,;]+$/, '')
      .trim();
    return t || fallback || 'אימון';
  }

  function splitInlineExercises(afterColon) {
    if (!afterColon) return [];
    return afterColon
      .split(/,| \+ /)
      .map(function (s) { return s.replace(/[.]+$/, '').trim(); })
      .filter(function (s) { return s.length > 1 && !isSessionMeta(s); });
  }

  // «פלאנק 1:30» / «מנוחה 0:45» / «3x0:40» is minutes:seconds, not two numbers in the name.
  // Exercise lines only - a title «אימון 18:00» keeps its clock time.
  function clockSeconds(text) {
    return String(text || '').replace(/(^|[^\d:.,])(\d{1,2}):([0-5]\d)(?![\d:])(?:\s*(?:דקות|דקה|דק['׳]))?(?=\s|$|[,.;)])/g,
      function (all, pre, min, sec) { return pre + (toInt(min) * 60 + toInt(sec)) + ' שניות'; });
  }

  function parseExerciseLine(line, defaults) {
    defaults = defaults || {};
    var s = quoteSeconds(line)
      .replace(/^(תחנה|תרגיל|עמדה)\s*\d+\s*[:.\-–]\s*/i, '')
      .replace(/^[•\-*]\s*/, '')
      .trim();
    s = clockSeconds(s);
    if (!s || classifyPhase(s) || isSessionMeta(s)) return null;
    if (isRestOrRepeatLine(s)) return null;

    var notes = [];
    var sets = defaults.sets != null ? defaults.sets : null;
    var reps = defaults.reps != null ? defaults.reps : null;
    // A session-wide «40 שניות עבודה» is only the fallback below; the line's own time wins.
    var duration_seconds = null;
    var rest_seconds = defaults.rest != null ? defaults.rest : null;

    // The rest after this exercise, not its work time: «סקוואט 3x12 מנוחה 60 שניות».
    var rest = restPhrase(s);
    if (rest) {
      rest_seconds = rest.seconds;
      s = s.replace(rest.match, ' ');
    }

    // The count after an x that follows a unit is the sets, not part of the name:
    // «פלאנק 30 שניות x 3», «ריצה 2 דקות x 4», «מתח 5 חזרות × 4», and «סקוואט 12 x 3 סטים» is 12 reps.
    s = s
      .replace(/(\d+(?:[.,]\d+)?\s*(?:חזרות|פעמים|שניות|שנ[׳']|″|דקות|דקה|דק[׳'])(?:\s*עבודה)?)\s*[x×]\s*(\d+)(?![\d.,]|\s*(?:שניות|שנ[׳']|″|דק|חזרות|פעמים|מטר|מ['׳]|ק["״]מ))(?:\s*(?:סטים|סט|סבבים|סבב)(?=\s|$|[,.;:]))?/i, '$1 $2 סבבים')
      .replace(/(^|\s)(\d+)\s*[x×]\s*(\d+)\s*(?:סטים|סט|סבבים|סבב)(?=\s|$|[,.;:])/i, '$1$2 חזרות $3 סבבים');

    // «3x12 חזרות» / «3x15 פעמים»: the unit after NxM is not part of the name.
    s = s.replace(/(\d+\s*[x×]\s*\d+)\s*(?:חזרות|פעמים)(?=\s|$|[,.;:])/i, '$1');
    // «בורפי 10 חזרות x 3 סבבים» / «מתח 4 סטים × 6»: an x next to sets or rounds is not part of the name.
    s = s.replace(/[x×]\s*(?=\d+\s*(?:סט|סבב))/gi, ' ')
      .replace(/(\d+\s*סט(?:ים)?)\s*[x×]\s*(?=\d)/i, '$1 של ');

    // «מתח מקסימום», «שכיבות סמיכה 3 סטים עד כשל», «מתח 3xמקס» are to failure, not 10 invented reps.
    var failure = false;
    var m = s.match(/(?:(\d+)\s*[x×]\s*|(?:^|\s))(?:עד\s+(?:ה)?כשל|(?:מקס(?:ימום)?|max)(?:\s+(?:חזרות|זמן))?|כמה\s+שיותר\s+חזרות)(?=\s|$|[,.;:])/i);
    if (m) {
      failure = true;
      if (m[1]) sets = toInt(m[1]);
      notes.push('עד כשל');
      s = s.replace(m[0], ' ');
    }

    // «לאנג׳ 3x10 לכל רגל» / «פלאנק צד 30 שניות לכל צד» / «3x10/10» is per side - a note, not the name.
    var side = null;
    m = s.match(/(?:^|\s)(?:ל?כל\s+(רגל|צד|יד|זרוע)|ל(רגל))(?=\s|$|[,.;:])/);
    if (m) {
      side = 'לכל ' + (m[1] || m[2]);
      s = s.replace(m[0], ' ');
    }
    m = s.match(/(\d+\s*[x×]\s*|^|\s)(\d+)\s*\/\s*(\d+)(?![\d.,\/])/i);
    if (m && m[2] === m[3]) {
      if (!side) side = 'לכל צד';
      s = s.replace(m[0], m[1] + m[2]);
    }
    if (side) notes.push(side);

    // A distance is the prescription, not reps: «ריצה 400 מטר», «ריצה 2 ק"מ», «ספרינט 6x50 מ'»,
    // and «ספרינט 50 מטר x 6» is 6 sets too (but «x 30 שניות» after it is left to the time parsing).
    var distance = null;
    m = s.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?\s*(?:מטרים|מטר|קילומטרים|קילומטר|ק["״]מ|קמ(?=\s|$|[,.;:])|מ['׳]|מ(?=\s|$|[,.;:])))(?:\s*[x×]\s*(\d+)(?![\d.,]|\s*(?:שניות|שנ[׳']|″|דק))(?:\s*(?:חזרות|פעמים|סטים|סבבים)(?=\s|$|[,.;:]))?)?/i);
    if (m) {
      distance = m[2].trim();
      if (m[1] || m[3]) sets = toInt(m[1] || m[3]);
      notes.push(distance);
      s = s.replace(m[0], ' ');
    }

    // A load is a note, not part of the name: «לחיצת חזה 4x8 80 קג», «סקוואט עם 100 ק"ג», «120kg».
    m = s.match(/(?:\s(?:עם|ב[-־]?)\s*(?:משקל\s*(?:של\s*)?)?|\s*@\s*)?(\d+(?:[.,]\d+)?)\s*(?:ק["״׳']?ג|קילוגרם|קילו|kg)(?=\s|$|[,.;:])/i);
    if (m) {
      notes.push(m[1] + ' ק״ג');
      s = s.replace(m[0], ' ');
    }

    // «3x10-12», «3 סטים של 8-10», «10-12 חזרות» are a rep range and «3x30-45 שניות» a time range:
    // the lower bound, the way the rest of the parser reads ranges, with the range kept as a note
    // instead of «-12» in the name.
    m = s.match(/((?:\d+\s*[x×]|\d+\s*סט(?:ים)?\s*(?:של)?)\s*)(\d+)\s*[-–]\s*(\d+)(?!\d|[.,]\d|\s*(?:שניות|שנ[׳']|″|דק))(?:\s*(?:חזרות|פעמים)(?=\s|$|[,.;:]))?/i) ||
      s.match(/()(\d+)\s*[-–]\s*(\d+)(?=\s*חזרות)/);
    if (m) {
      notes.push(m[2] + '-' + m[3] + ' חזרות');
      s = s.replace(m[0], m[1] + m[2]);
    } else if ((m = s.match(/((?:\d+\s*[x×]|\d+\s*סט(?:ים)?\s*(?:של)?)\s*)(\d+)\s*[-–]\s*(\d+)(?=\s*(?:שניות|שנ[׳']|″))/i))) {
      notes.push(m[2] + '-' + m[3] + ' שניות');
      s = s.replace(m[0], m[1] + m[2]);
    }

    // «3 סטים של 12» is 12 reps, but «3 סטים של 30 שניות» / «של 2 דקות» is 30 s / 2 min per set.
    // A full stop or comma after the count («3 סטים של 12.») ends the line; only «1.5» is a decimal.
    m = s.match(/(\d+)\s*סט(?:ים)?(?=\s|$|[,.;:])\s*(?:של\s*)?(?:(\d+)(?!\d|[.,]\d|\s*(?:שניות|שנ[׳']|″|דק)))?(?:\s*חזרות)?/);
    if (m) {
      sets = toInt(m[1]);
      if (m[2]) reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    }

    // «בורפי 30 שניות, 3 סבבים» - the line's own rounds are its sets.
    m = s.match(/(\d+)\s*סבבים(?=\s|$|[,.;:])(?:\s*של(?=\s))?/);
    if (m) {
      sets = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    // «3x12» is 12 reps, but «3x30 שניות» / «3x1 דקה» is 30 s / 1 min per set.
    m = s.match(/(\d+)\s*[x×]\s*(\d+)(?!\d|[.,]\d|\s*(?:שניות|שנ[׳']|″|דק))/i);
    if (m) {
      sets = toInt(m[1]);
      reps = toInt(m[2]);
      s = s.replace(m[0], ' ');
    } else if ((m = s.match(/(\d+)\s*[x×]\s*(?=\d+(?:[.,]\d+)?\s*(?:שניות|שנ[׳']|″|דק))/i))) {
      sets = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    m = s.match(/(\d+)\s*חזרות/);
    if (m) {
      reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    m = s.match(/(\d+)\s*(?:שניות|שנ[׳']|″)(?:\s*עבודה(?=\s|$|[,.;:]))?/);
    if (m) {
      duration_seconds = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    // "ריצה 5 דקות" / "הליכה דקה" / "פלאנק 1.5 דקות" are timed work, not 10 reps.
    var minutes = duration_seconds == null ? minutesPhrase(s) : null;
    if (minutes) {
      duration_seconds = minutes.seconds;
      s = s.replace(minutes.match, ' ');
    }

    // «שכיבות סמיכה 15 פעמים» is 15 reps; «ספרינט 10 מטר 5 פעמים» / «בורפי 3 פעמים 30 שניות» is 5 / 3 sets.
    m = s.match(/(\d+)\s*(?:פעמים|פעם)(?=\s|$|[,.;:])/);
    if (m) {
      if (distance || failure || duration_seconds != null) sets = toInt(m[1]);
      else if (reps == null || reps === defaults.reps) reps = toInt(m[1]);
      s = s.replace(m[0], ' ');
    }

    var name = s.replace(/[\-–—,.:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2) return null;

    if (reps == null && duration_seconds == null && (distance || (failure && !defaults.workSeconds))) {
      if (sets == null) sets = defaults.sets != null ? defaults.sets : 1;
    } else if (reps == null && duration_seconds == null) {
      if (defaults.workSeconds) duration_seconds = defaults.workSeconds;
      else reps = 10;
    }
    if (sets == null && (reps != null || duration_seconds != null)) {
      sets = defaults.sets != null ? defaults.sets : 1;
    }

    return {
      name: name,
      sets: sets,
      reps: reps,
      duration_seconds: duration_seconds,
      rest_seconds: rest_seconds,
      notes: notes.length ? notes.join(', ') : null
    };
  }

  // The part of a line that may set the whole session: the title, a phase header
  // (before its colon), «בצעו 3 סבבים», or a line that is not an exercise
  // («40 שניות עבודה», «3 סבבים:»). «בורפי 30 שניות עבודה, 3 סבבים» is only בורפי's.
  function sessionPart(line, index) {
    if (index === 0) return line;
    if (classifyPhase(line)) return line.indexOf(':') === -1 ? line : line.slice(0, line.indexOf(':'));
    if (/^(?:בצעו|לבצע|חזרו|לחזור|הכל|הכול|סה״כ|סה"כ|סך הכול)(?:\s|$|[:,])/.test(line)) return line;
    return parseExerciseLine(line, {}) ? '' : line;
  }

  function scanSessionDefaults(text) {
    var defaults = { sets: null, reps: null, rest: null, workSeconds: null };
    // Only the title or a rest line speaks for the whole session; an exercise's own rest stays on it.
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length && defaults.rest == null; i++) {
      var line = lines[i].trim();
      if (i > 0 && !isSessionMeta(line)) continue;
      var rest = restPhrase(line);
      if (rest) defaults.rest = rest.seconds;
    }
    var session = lines.map(function (l, idx) { return sessionPart(l.trim(), idx); }).join('\n');
    var rounds = session.match(/(\d+)\s*סבבים/);
    if (rounds) defaults.sets = toInt(rounds[1]);
    var twice = text.match(/חזור על הסבב\s+פעמיים/);
    if (twice && !defaults.sets) defaults.sets = 2;
    var work = session.match(/(\d+)\s*שניות עבודה/);
    if (work) defaults.workSeconds = toInt(work[1]);
    return defaults;
  }

  function emptyPhase(name, minutes) {
    return { name: name, duration_minutes: minutes || null, exercises: [] };
  }

  var catalogJsonCache = null;

  function rawCatalogEntry(id) {
    if (!id) return null;
    if (typeof require === 'function') {
      try {
        if (!catalogJsonCache) catalogJsonCache = require('../js/catalog.json');
        return catalogJsonCache[id] || null;
      } catch (e) {}
    }
    return null;
  }

  function parseExercise(ref) {
    var entry = null;
    var meta = null;
    if (ref && typeof ref === 'object' && ref.id) {
      entry = ref;
      meta = ref;
    } else if (typeof ref === 'string' && ref) {
      meta = rawCatalogEntry(ref);
      var api = (typeof globalThis !== 'undefined' && globalThis.TH) || root.TH;
      if (api && typeof api.findExercise === 'function') entry = api.findExercise({ id: ref });
      if (!entry && meta) entry = meta;
    }
    if (!entry) return null;
    if (!meta) meta = rawCatalogEntry(entry.id) || entry;

    var tags = meta.tags || [];
    var warningTag = null;
    if (tags.indexOf('dangerous') !== -1) {
      warningTag = {
        id: 'dangerous',
        he: meta.warningHe || 'תרגיל שדורש זהירות — ודאו התאמה לרמתכם.'
      };
    }

    return {
      id: entry.id,
      he: entry.he,
      muscles: entry.muscles,
      equipment: entry.equipment,
      level: entry.level,
      warningTag: warningTag
    };
  }

  function parseWorkoutClient(text) {
    var raw = String(text || '').trim();
    if (!raw) {
      return {
        title: 'אימון',
        duration_minutes: 30,
        participants: null,
        equipment: [],
        phases: [],
        intensity: 'medium',
        tags: ['general']
      };
    }

    var normalized = quoteSeconds(raw);
    var lines = normalized.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var defaults = scanSessionDefaults(normalized);
    var total = raw.match(/(?:סך הכול|סה״כ|סה"כ)\s*:?\s*(\S+(?:[ \t]+\S+){0,2})/);
    var duration_minutes = (total && parseDurationMinutes(total[1])) || parseDurationMinutes(lines[0]) || 30;
    var participants = parseParticipants(raw);
    var equipment = parseEquipment(raw);
    var intensity = parseIntensity(raw);
    var tags = parseTags(raw);
    var title = cleanTitle(lines[0], 'אימון');

    var phases = [];
    var current = null;
    var sawExplicitPhase = false;

    function ensure(name) {
      if (current && current.name === name) return current;
      var found = null;
      for (var i = 0; i < phases.length; i++) {
        if (phases[i].name === name) { found = phases[i]; break; }
      }
      if (found) {
        current = found;
        return current;
      }
      current = emptyPhase(name, null);
      phases.push(current);
      return current;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var phaseKind = classifyPhase(line);
      if (phaseKind) {
        sawExplicitPhase = true;
        current = ensure(phaseKind);
        var mins = parseDurationMinutes(line);
        if (mins) current.duration_minutes = mins;
        var colon = line.indexOf(':');
        if (colon !== -1) {
          var inlineDefaults = phaseKind === PHASE_NAMES.main ? defaults : {
            sets: 1, reps: null, rest: null,
            workSeconds: Math.max(30, Math.round(((mins || 5) * 60) / 3))
          };
          var inline = splitInlineExercises(line.slice(colon + 1));
          for (var j = 0; j < inline.length; j++) {
            var ex = parseExerciseLine(inline[j], inlineDefaults);
            if (ex) current.exercises.push(ex);
          }
        }
        continue;
      }

      if (i === 0) continue;
      if (isSessionMeta(line)) continue;

      var parsed = parseExerciseLine(line, defaults);
      if (!parsed) continue;
      // Warm-up is usually a single header line; following work belongs to Main.
      // Cool-down at the end keeps the lines that follow it.
      if (!current || current.name === PHASE_NAMES.warmup) {
        current = ensure(PHASE_NAMES.main);
      }
      current.exercises.push(parsed);
    }

    if (!sawExplicitPhase && phases.length === 0) {
      var main = emptyPhase(PHASE_NAMES.main, Math.max(10, duration_minutes - 10));
      for (var k = 1; k < lines.length; k++) {
        var p = parseExerciseLine(lines[k], defaults);
        if (p) main.exercises.push(p);
      }
      if (main.exercises.length) phases.push(main);
    }

    function hasPhase(name) {
      for (var i = 0; i < phases.length; i++) if (phases[i].name === name) return phases[i];
      return null;
    }

    // «חימום 2 דקות» with no exercise gets 2 minutes of warm-up, not 3.
    function fillerSeconds(phase) {
      return phase.duration_minutes ? Math.min(180, Math.round(phase.duration_minutes * 60)) : 180;
    }

    if (!hasPhase(PHASE_NAMES.warmup)) {
      phases.unshift({
        name: PHASE_NAMES.warmup,
        duration_minutes: 5,
        exercises: [{
          name: 'חימום כללי',
          sets: 1,
          reps: null,
          duration_seconds: 180,
          rest_seconds: null,
          notes: null
        }]
      });
    } else if (!hasPhase(PHASE_NAMES.warmup).exercises.length) {
      hasPhase(PHASE_NAMES.warmup).exercises.push({
        name: 'חימום כללי',
        sets: 1,
        reps: null,
        duration_seconds: fillerSeconds(hasPhase(PHASE_NAMES.warmup)),
        rest_seconds: null,
        notes: null
      });
    }

    if (!hasPhase(PHASE_NAMES.main) || !hasPhase(PHASE_NAMES.main).exercises.length) {
      var existingMain = hasPhase(PHASE_NAMES.main);
      var fallbackEx = {
        name: title,
        sets: defaults.sets || 3,
        reps: defaults.reps || 10,
        duration_seconds: defaults.workSeconds || null,
        rest_seconds: defaults.rest || 60,
        notes: null
      };
      if (existingMain) existingMain.exercises.push(fallbackEx);
      else phases.push({ name: PHASE_NAMES.main, duration_minutes: 20, exercises: [fallbackEx] });
    }

    if (!hasPhase(PHASE_NAMES.cooldown)) {
      phases.push({
        name: PHASE_NAMES.cooldown,
        duration_minutes: 5,
        exercises: [{
          name: 'מתיחות',
          sets: 1,
          reps: null,
          duration_seconds: 180,
          rest_seconds: null,
          notes: null
        }]
      });
    } else if (!hasPhase(PHASE_NAMES.cooldown).exercises.length) {
      hasPhase(PHASE_NAMES.cooldown).exercises.push({
        name: 'מתיחות',
        sets: 1,
        reps: null,
        duration_seconds: fillerSeconds(hasPhase(PHASE_NAMES.cooldown)),
        rest_seconds: null,
        notes: null
      });
    }

    var order = { 'Warm-up': 0, 'Main': 1, 'Cool-down': 2 };
    phases.sort(function (a, b) {
      return (order[a.name] != null ? order[a.name] : 9) - (order[b.name] != null ? order[b.name] : 9);
    });

    var assigned = 0;
    var missing = [];
    for (var p = 0; p < phases.length; p++) {
      if (!phases[p].duration_minutes) {
        if (phases[p].name === PHASE_NAMES.warmup || phases[p].name === PHASE_NAMES.cooldown) {
          phases[p].duration_minutes = 5;
        }
      }
      if (phases[p].duration_minutes) assigned += phases[p].duration_minutes;
      else missing.push(phases[p]);
    }
    if (missing.length) {
      var remain = Math.max(5, duration_minutes - assigned);
      var slice = Math.max(1, Math.round(remain / missing.length));
      for (var midx = 0; midx < missing.length; midx++) missing[midx].duration_minutes = slice;
    }

    var workout = {
      title: title,
      duration_minutes: duration_minutes,
      participants: participants,
      equipment: equipment,
      phases: phases,
      intensity: intensity,
      tags: tags,
      source_text: raw,
      source: 'client-fallback'
    };
    var api = (typeof globalThis !== 'undefined' && globalThis.TH) || root.TH;
    if (api && typeof api.attachCatalogIds === 'function') api.attachCatalogIds(workout);
    return workout;
  }

  root.parseWorkoutClient = parseWorkoutClient;
  root.parseExercise = parseExercise;
})(typeof window !== 'undefined' ? window : this);
