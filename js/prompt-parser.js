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
    legs: ['רגליים', 'רגל', 'ירכיים', 'ארבע ראשי', 'סקוואט', 'מכרעים'],
    back: ['גב', 'חתירה', 'אוסטרלי'],
    chest: ['חזה', 'שכיבות'],
    shoulders: ['כתפיים', 'כתף'],
    biceps: ['דו ראשי', 'דו-ראשי', 'דו־ראשי', 'בייספס'],
    triceps: ['תלת ראשי', 'תלת-ראשי', 'תלת־ראשי', 'טרייספס'],
    arms: ['ידיים', 'יד']
  };

  function toInt(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function parseDuration(text) {
    var t = String(text || '');
    var m = t.match(/(\d+)\s*דק/);
    if (m) return toInt(m[1]);
    if (/חצי\s*שעה/.test(t)) return 30;
    if (/רבע\s*שעה/.test(t)) return 15;
    // "שעה וחצי" / "שעה ורבע" (an hour and a half / and a quarter) were excluded by the plain-hour rule below
    if (/שעה\s*וחצי/.test(t)) return 90;
    if (/שעה\s*ורבע/.test(t)) return 75;
    if (/שעה(?!\s*ו)/.test(t) && !/חצי|רבע/.test(t)) return 60;
    m = t.match(/(\d+)\s*min/i);
    if (m) return toInt(m[1]);
    return null;
  }

  function parseParticipants(text) {
    var t = Infer.fold(String(text || ''));
    var terms = '(?:חניכ(?:ים|ות)?|מתאמנ(?:ים|ות)?|משתתפ(?:ים|ות)?|ילד(?:ים|ות)?|אנשים|שחקנ(?:ים|יות)?|participants?|athletes?|players?)';

    // Digits first: "20 ילדים, מתוכם ארבעה ילדים מתחילים" is a group of 20, not 4.
    var m = t.match(new RegExp('(\\d+)\\s*' + terms, 'i'));
    if (!m) m = t.match(/(?:קבוצה|כיתה)\s*(?:של|עם)?\s*(\d+)/);
    var n = m ? toInt(m[1]) : null;

    // Then Hebrew number words, masculine and feminine, 1-10 and the teens 11-19
    // ("חמש עשרה ילדים" is 15; its "עשרה" alone must not read as 10).
    if (n == null) {
      var units = [
        ['שניים', 2], ['שנים', 2], ['שתיים', 2], ['שתים', 2], ['שני', 2], ['שתי', 2],
        ['שלושה', 3], ['שלוש', 3], ['ארבעה', 4], ['ארבע', 4], ['חמישה', 5], ['חמש', 5],
        ['שישה', 6], ['שש', 6], ['שבעה', 7], ['שבע', 7], ['שמונה', 8], ['תשעה', 9], ['תשע', 9],
        ['עשרה', 10], ['עשר', 10], ['אחד', 1], ['אחת', 1]
      ];
      var values = {};
      var alt = units.map(function (u) { values[u[0]] = u[1]; return u[0]; }).join('|');
      var w = t.match(new RegExp('(?:^|[^\\u0590-\\u05FF])[ולבהמש]?(' + alt + ')(?:\\s+(עשרה|עשר))?\\s+' + terms, 'i'));
      if (w) n = values[w[1]] + (w[2] && values[w[1]] < 10 ? 10 : 0);
    }
    return n && n > 0 ? Math.min(n, 500) : null;
  }

  function parseLevel(text) {
    var t = Infer.fold(text);
    if (/מתקדמ|advanced/.test(t)) return 'advanced';
    if (/ביניים|בינים|intermediate/.test(t)) return 'intermediate';
    if (/מתחיל|beginner/.test(t)) return 'beginner';
    return null;
  }

  function parseGoal(text) {
    var t = Infer.fold(text);
    if (/כוח|strength/.test(t) && !/חיזוק/.test(t)) return 'strength';
    if (/חיזוק כוח/.test(t)) return 'strength';
    if (/היפרטרופ|מסת שריר|muscle/.test(t)) return 'hypertrophy';
    if (/סיבולת|endurance/.test(t)) return 'endurance';
    if (/ליבה|ייצוב|core/.test(t) && /מטרה|גירוי/.test(t)) return 'core';
    return null;
  }

  function parseEquipment(text) {
    var t = Infer.fold(text);
    if (/בלי ציוד|ללא ציוד|בלי שום ציוד|משקל גוף|bodyweight/.test(t)) return ['none'];
    var inferred = Infer.inferEquipment(t);
    if (inferred.length === 1 && inferred[0] === 'none') {
      if (/עם גומי|גומיות|גומייה/.test(t)) return ['band'];
      if (/עם קונוס|קונוסים/.test(t)) return ['cones'];
      if (/עם כדור/.test(t)) return ['ball'];
      return [];
    }
    return inferred;
  }

  function parseAudience(text) {
    var t = Infer.fold(text);
    if (/ילד/.test(t)) return 'kids';
    if (/זוג|פרטנר/.test(t)) return 'partner';
    if (/ספורט|כדורגל|כדורסל/.test(t)) return 'sport';
    return '';
  }

  function parseMuscles(text) {
    var t = Infer.fold(text);
    var muscles = [];
    var focus = null;
    if (/פול.?בודי|פול בודי|גוף מלא|full.?body|כל הגוף/.test(t)) {
      return { muscles: [], focus: 'full' };
    }
    Object.keys(MUSCLE_KEYS).forEach(function (key) {
      MUSCLE_KEYS[key].forEach(function (word) {
        if (t.indexOf(Infer.fold(word)) !== -1) {
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
    if (/מתח/.test(t) && !/מתחיל/.test(t)) {
      muscles.push('back', 'biceps');
      if (!focus) focus = 'back';
    }
    muscles = Infer.uniq(muscles);
    return { muscles: muscles, focus: focus || (muscles.length ? muscles[0] : 'full') };
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
