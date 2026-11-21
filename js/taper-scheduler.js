((root) => {
  const STORAGE_KEY = 'trainerhub_taper_target_date';

  function parseDateOnly(input) {
    if (!input) return null;
    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) return null;
      return {
        year: input.getFullYear(),
        month: input.getMonth(),
        date: input.getDate()
      };
    }
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    let m = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const date = parseInt(m[3], 10);
      const check = new Date(year, month, date);
      if (check.getFullYear() === year && check.getMonth() === month && check.getDate() === date) {
        return { year, month, date };
      }
      return null;
    }

    m = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (m) {
      const date = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      const check = new Date(year, month, date);
      if (check.getFullYear() === year && check.getMonth() === month && check.getDate() === date) {
        return { year, month, date };
      }
      return null;
    }

    const t = Date.parse(trimmed);
    if (!Number.isNaN(t)) {
      const dt = new Date(t);
      return {
        year: dt.getFullYear(),
        month: dt.getMonth(),
        date: dt.getDate()
      };
    }
    return null;
  }

  function formatDateObj(d) {
    const mm = String(d.month + 1).padStart(2, '0');
    const dd = String(d.date).padStart(2, '0');
    return `${d.year}-${mm}-${dd}`;
  }

  function calculateTaperWindow(targetDateStr, todayDateStr) {
    const targetParsed = parseDateOnly(targetDateStr);
    if (!targetParsed) {
      return {
        isValid: false,
        phase: null,
        daysRemaining: null,
        recommendation: '',
        volumeReduction: '0%',
        volumeReductionPercent: '0%',
        reductionMinPercent: 0,
        reductionMaxPercent: 0,
        targetDate: null,
        todayDate: null
      };
    }

    let todayParsed = null;
    if (todayDateStr !== undefined && todayDateStr !== null) {
      todayParsed = parseDateOnly(todayDateStr);
      if (!todayParsed) {
        return {
          isValid: false,
          phase: null,
          daysRemaining: null,
          recommendation: '',
          volumeReduction: '0%',
          volumeReductionPercent: '0%',
          reductionMinPercent: 0,
          reductionMaxPercent: 0,
          targetDate: formatDateObj(targetParsed),
          todayDate: null
        };
      }
    } else {
      const now = new Date();
      todayParsed = {
        year: now.getFullYear(),
        month: now.getMonth(),
        date: now.getDate()
      };
    }

    const utcTarget = Date.UTC(targetParsed.year, targetParsed.month, targetParsed.date);
    const utcToday = Date.UTC(todayParsed.year, todayParsed.month, todayParsed.date);
    const diffDays = Math.round((utcTarget - utcToday) / (24 * 60 * 60 * 1000));

    let phase = 'build';
    let recommendation = 'שלב בנייה: שמירה על עצימות ונפח אימון רגיל כחלק מתוכנית ההכנה לקראת בוחן הכושר.';
    let volumeReduction = '0%';
    let volumeReductionPercent = '0%';
    let reductionMinPercent = 0;
    let reductionMaxPercent = 0;

    if (diffDays <= 0) {
      phase = 'rest_ready';
      recommendation =
        diffDays === 0
          ? 'מוכנות ומנוחה: יום היעד הגיע, מנוחה והתמקדות בביצוע מיטבי.'
          : 'יום היעד חלף: שלב מנוחה והתאוששות.';
      volumeReduction = 'מנוחה מלאה';
      volumeReductionPercent = '50%';
      reductionMinPercent = 50;
      reductionMaxPercent = 50;
    } else if (diffDays <= 3) {
      phase = 'taper_light';
      recommendation =
        'חידוד והפחתת עומס: המלצת הורדת נפח של 40-50% בשלושת הימים האחרונים לשמירה על רעננות לקראת בוחן הכושר.';
      volumeReduction = '40-50%';
      volumeReductionPercent = '40-50%';
      reductionMinPercent = 40;
      reductionMaxPercent = 50;
    }

    return {
      isValid: true,
      daysRemaining: diffDays,
      phase,
      recommendation,
      volumeReduction,
      volumeReductionPercent,
      reductionMinPercent,
      reductionMaxPercent,
      targetDate: formatDateObj(targetParsed),
      todayDate: formatDateObj(todayParsed)
    };
  }

  function getStoredTargetDate(storage) {
    try {
      const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      return s ? s.getItem(STORAGE_KEY) : null;
    } catch (_e) {
      return null;
    }
  }

  function setStoredTargetDate(targetDateStr, storage) {
    try {
      const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (s) {
        if (targetDateStr) {
          s.setItem(STORAGE_KEY, targetDateStr);
        } else {
          s.removeItem(STORAGE_KEY);
        }
        return true;
      }
    } catch (_e) {
      return false;
    }
    return false;
  }

  const api = {
    STORAGE_KEY,
    calculateTaperWindow,
    getStoredTargetDate,
    setStoredTargetDate
  };

  if (root) {
    root.THTaperScheduler = api;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.taperScheduler = api;
    }
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
