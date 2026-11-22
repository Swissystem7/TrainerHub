/**
 * Polarized Intensity Balance Analyzer (80/20 Rule)
 * Analyzes the balance between moderate/controlled sessions and high-intensity/HIIT sessions.
 * Classifies into 'balanced_80_20' or 'too_much_high_intensity'.
 * Suggests swapping one high-intensity session with a moderate one when overloaded.
 * CommonJS & UMD module.
 * Namespace: window.THPolarizedBalance
 */
((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const mod = factory();
    root.THPolarizedBalance = mod;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.polarizedBalance = mod;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, () => {
  const HIGH_INTENSITY_REGEX = /hiit|אינטרוולים|קצה|הפוגות|ספרינט|עצימות גבוהה|דופק מרבי|tabata/i;
  const MODERATE_INTENSITY_REGEX = /moderate|low|medium|controlled|מתון|מבוקר|אירובי|התאוששות/i;

  function isHighIntensitySession(session) {
    if (!session) return false;
    if (typeof session === 'string') {
      const s = session.trim().toLowerCase();
      if (MODERATE_INTENSITY_REGEX.test(s)) return false;
      return HIGH_INTENSITY_REGEX.test(s) || /high|hard|extreme|max/.test(s);
    }
    if (typeof session !== 'object') return false;

    if (session.isHiit === true || session.isHighIntensity === true) {
      return true;
    }

    if (session.intensity) {
      const intStr = String(session.intensity).trim().toLowerCase();
      if (MODERATE_INTENSITY_REGEX.test(intStr)) return false;
      if (HIGH_INTENSITY_REGEX.test(intStr) || /high|hard|extreme|max|גבוה/.test(intStr)) return true;
    }

    if (session.type || session.kind || session.category) {
      const t = String(session.type || session.kind || session.category)
        .trim()
        .toLowerCase();
      if (MODERATE_INTENSITY_REGEX.test(t)) return false;
      if (HIGH_INTENSITY_REGEX.test(t) || /sprint|tabata/.test(t)) return true;
    }

    if (session.load?.effort_he) {
      const eff = String(session.load.effort_he).trim().toLowerCase();
      if (MODERATE_INTENSITY_REGEX.test(eff)) return false;
      if (/גבוה|קצה|מרבי|אינטרוולים/.test(eff)) return true;
    }

    const textFields = [session.focus, session.focus_he, session.name, session.title, session.split];
    for (const f of textFields) {
      if (typeof f === 'string' && HIGH_INTENSITY_REGEX.test(f)) {
        return true;
      }
    }

    if (Array.isArray(session.items_he)) {
      for (const item of session.items_he) {
        if (typeof item === 'string' && /אינטרוולים|ספרינט|דופק מקסימלי|עצימות מרבית/.test(item)) {
          return true;
        }
      }
    }

    if (Array.isArray(session.tags)) {
      for (const tag of session.tags) {
        if (typeof tag === 'string') {
          const t = tag.trim().toLowerCase();
          if (MODERATE_INTENSITY_REGEX.test(t)) return false;
          if (HIGH_INTENSITY_REGEX.test(t) || /high/.test(t)) return true;
        }
      }
    }

    return false;
  }

  function evaluatePolarizedBalance(weeklySessions) {
    const sessions = Array.isArray(weeklySessions) ? weeklySessions : [];
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return {
        status: 'balanced_80_20',
        isBalanced: true,
        totalSessions: 0,
        moderateCount: 0,
        highCount: 0,
        moderateRatio: 1,
        highRatio: 0,
        moderatePct: 100,
        highPct: 0,
        ratio: { moderate: 1, high: 0 },
        percentages: { moderate: 100, high: 0 },
        suggestion: null,
        recommendation: null,
        message: 'אין נתוני אימונים שבועיים לבדיקת איזון עצימות'
      };
    }

    let highCount = 0;
    for (let i = 0; i < totalSessions; i++) {
      if (isHighIntensitySession(sessions[i])) {
        highCount++;
      }
    }

    const moderateCount = totalSessions - highCount;
    const highRatio = highCount / totalSessions;
    const moderateRatio = moderateCount / totalSessions;
    const highPct = Math.round(highRatio * 100);
    const moderatePct = 100 - highPct;

    const isExcess = highRatio > 0.2;
    const status = isExcess ? 'too_much_high_intensity' : 'balanced_80_20';
    const isBalanced = !isExcess;

    const suggestion = isExcess ? 'מומלץ להחליף אימון קצה אחד באימון מתון למניעת שחיקה' : null;

    const message = isBalanced
      ? 'איזון עצימות שבועי 80/20 תקין ומבוקר'
      : 'עודף אימוני עצימות גבוהה/HIIT מעבר ל-20% - מומלץ להחליף אימון קצה אחד באימון מתון';

    return {
      status,
      isBalanced,
      totalSessions,
      moderateCount,
      highCount,
      moderateRatio,
      highRatio,
      moderatePct,
      highPct,
      ratio: { moderate: moderateRatio, high: highRatio },
      percentages: { moderate: moderatePct, high: highPct },
      suggestion,
      recommendation: suggestion,
      message
    };
  }

  return {
    evaluatePolarizedBalance,
    isHighIntensitySession
  };
});
