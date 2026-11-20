(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THHomeBaseline = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function evaluateHomeBaseline(pushups, plankSeconds, squats60s) {
    var p = Number(pushups);
    var pl = Number(plankSeconds);
    var s = Number(squats60s);

    if (isNaN(p) || isNaN(pl) || isNaN(s) || p < 0 || pl < 0 || s < 0) {
      return {
        level: 'beginner',
        levelHe: 'מתחילים',
        focus: 'שכיבות סמיכה בשיפוע, פלאנק קצר, סקוואט בקרת קצב',
        score: 0
      };
    }

    // Advanced criteria: pushups >= 30, plank >= 90, squats60s >= 45
    if (p >= 30 && pl >= 90 && s >= 45) {
      return {
        level: 'advanced',
        levelHe: 'מתקדמים',
        focus: 'שכיבות סמיכה מלאות, פלאנק ממושך, סקוואט דינמי עמוק',
        score: p + pl + s
      };
    }

    // Intermediate criteria: pushups >= 15, plank >= 45, squats60s >= 30
    if (p >= 15 && pl >= 45 && s >= 30) {
      return {
        level: 'intermediate',
        levelHe: 'בינוני',
        focus: 'תרגילי בסיס עם אתגר מתקדם, סיבולת שריר',
        score: p + pl + s
      };
    }

    return {
      level: 'beginner',
      levelHe: 'מתחילים',
      focus: 'בניית בסיס כוח וסיבולת הדרגתית',
      score: p + pl + s
    };
  }

  function saveBaselineResult(result, storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || typeof store.setItem !== 'function') {
      return false;
    }
    try {
      store.setItem('trainerhub_home_baseline', JSON.stringify({
        result: result,
        savedAt: new Date().toISOString()
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    evaluateHomeBaseline: evaluateHomeBaseline,
    saveBaselineResult: saveBaselineResult
  };
}));
