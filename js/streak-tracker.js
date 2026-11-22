/**
 * TrainerHub — Weekly streak tracker and consistency metric engine.
 * UMD / CommonJS compatible.
 * Namespace: window.THStreakTracker
 */
((root) => {
  function parseDate(item) {
    if (!item) return null;
    if (item instanceof Date) {
      return Number.isNaN(item.getTime()) ? null : item;
    }
    if (typeof item === 'number') {
      const dNum = new Date(item);
      return Number.isNaN(dNum.getTime()) ? null : dNum;
    }
    if (typeof item === 'string') {
      const dStr = new Date(item);
      return Number.isNaN(dStr.getTime()) ? null : dStr;
    }
    if (typeof item === 'object') {
      const raw = item.doneAt || item.date || item.at || item.timestamp || item.loggedAt;
      if (!raw) return null;
      const dObj = new Date(raw);
      return Number.isNaN(dObj.getTime()) ? null : dObj;
    }
    return null;
  }

  function getWeekStartKey(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getShiftedWeekKey(weekKey, weeksAgo) {
    const parts = weekKey.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2] - weeksAgo * 7, 12, 0, 0);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function buildEncouragementMessage(streak) {
    if (streak <= 0) {
      return 'התמדה ותפקוד לאורך זמן נבנים צעד אחר צעד, ולא נמדדים לפי משקל בודד. כל אימון מקדם אותך!';
    }
    if (streak === 1) {
      return 'שבוע ראשון של עמידה ביעד הושלם! התמדה ותפקוד לאורך זמן חשובים בהרבה ממשקל בודד.';
    }
    return `רצף מרשים של ${streak} שבועות ברציפות! התמדה ותפקוד לאורך זמן הם המפתח האמיתי, ולא משקל בודד.`;
  }

  function calculateWeeklyStreak(sessions, referenceDate, targetPerWeek) {
    const ref = parseDate(referenceDate) || new Date();
    const target =
      typeof targetPerWeek === 'number' && Number.isFinite(targetPerWeek) && targetPerWeek > 0
        ? Math.floor(targetPerWeek)
        : 3;

    const weekCounts = {};
    if (Array.isArray(sessions)) {
      for (let i = 0; i < sessions.length; i++) {
        const dt = parseDate(sessions[i]);
        if (!dt) continue;
        const wKey = getWeekStartKey(dt);
        weekCounts[wKey] = (weekCounts[wKey] || 0) + 1;
      }
    }

    const currentWeekKey = getWeekStartKey(ref);
    const currentWeekCount = weekCounts[currentWeekKey] || 0;
    let streak = 0;

    if (currentWeekCount >= target) {
      streak = 1;
      let weeksAgo = 1;
      while (true) {
        const prevKey = getShiftedWeekKey(currentWeekKey, weeksAgo);
        if ((weekCounts[prevKey] || 0) >= target) {
          streak += 1;
          weeksAgo += 1;
        } else {
          break;
        }
      }
    } else {
      const prevWeekKey = getShiftedWeekKey(currentWeekKey, 1);
      if ((weekCounts[prevWeekKey] || 0) >= target) {
        streak = 1;
        let backAgo = 2;
        while (true) {
          const earlierKey = getShiftedWeekKey(currentWeekKey, backAgo);
          if ((weekCounts[earlierKey] || 0) >= target) {
            streak += 1;
            backAgo += 1;
          } else {
            break;
          }
        }
      }
    }

    const complianceRate = Math.min(100, Math.round((currentWeekCount / target) * 100));
    const message = buildEncouragementMessage(streak);

    return {
      streak: streak,
      currentStreak: streak,
      complianceRate: complianceRate,
      adherenceRate: complianceRate,
      weeklyAdherence: complianceRate,
      weeklyAdherencePct: complianceRate,
      targetPerWeek: target,
      sessionsThisWeek: currentWeekCount,
      message: message
    };
  }

  const api = {
    calculateWeeklyStreak: calculateWeeklyStreak
  };

  root.THStreakTracker = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
