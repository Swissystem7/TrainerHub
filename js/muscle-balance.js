/**
 * Weekly Muscle Group Balance Analyzer (Push / Pull / Legs / Core)
 * Analyzes direct and 0.5 indirect sets over the last 7 days,
 * identifies deficient (< 4 sets) or overloaded groups,
 * and recommends the next workout focus.
 * CommonJS & UMD module.
 * Namespace: window.THMuscleBalance
 */
((root) => {
  const MIN_EFFECTIVE_SETS = 4;
  const OVERLOAD_SETS = 14;

  const GROUP_LABELS = {
    push: 'דחיפה',
    pull: 'משיכה',
    legs: 'רגליים',
    core: 'ליבה'
  };

  function normalizeText(val) {
    if (typeof val !== 'string') return '';
    return val.trim().toLowerCase();
  }

  const MUSCLE_MAP = {
    push: 'push',
    דחיפה: 'push',
    chest: 'push',
    חזה: 'push',
    shoulders: 'push',
    כתפיים: 'push',
    triceps: 'push',
    'תלת-ראשי': 'push',
    'יד אחורית': 'push',
    pull: 'pull',
    משיכה: 'pull',
    back: 'pull',
    גב: 'pull',
    biceps: 'pull',
    'דו-ראשי': 'pull',
    'יד קדמית': 'pull',
    lats: 'pull',
    legs: 'legs',
    leg: 'legs',
    רגליים: 'legs',
    squat: 'legs',
    hinge: 'legs',
    quads: 'legs',
    'ארבע ראשי': 'legs',
    hamstrings: 'legs',
    המסטרינג: 'legs',
    glutes: 'legs',
    ישבן: 'legs',
    calves: 'legs',
    תאומים: 'legs',
    שוקיים: 'legs',
    core: 'core',
    ליבה: 'core',
    abs: 'core',
    בטן: 'core'
  };

  function mapMuscleToGroup(muscle) {
    const m = normalizeText(muscle);
    if (!m) return null;
    return MUSCLE_MAP[m] || null;
  }

  function inferGroupFromName(name) {
    const t = normalizeText(name);
    if (!t) return null;

    if (/הרמת רגליים|הרמות רגליים/.test(t)) return 'core';
    if (/לחיצת רגליים|לחיצות רגליים/.test(t)) return 'legs';
    if (
      /סקוואט|מכרע|לאנג'|דדליפט|פשיטת ברכי|כפיפת ברכי|שוקי|תאומים|ירכ|ישבן|squat|lunge|deadlift|leg press|calf/i.test(t)
    ) {
      return 'legs';
    }
    if (/מתח|חתיר|משיכ|פטיש|כפיפת מרפק|בייספס|אוסטרל|שראג|pull-?up|chin-?up|row|lat pull|curl/i.test(t)) {
      return 'pull';
    }
    if (/פלאנק|בטן|ליבה|קראנץ|כפיפ(ות|ת) בטן|מטפס הרים|גלגל בטן|plank|sit-?up|crunch|leg raise|core|abs/i.test(t)) {
      return 'core';
    }
    if (/שכיב(ות|ת) סמיכה|לחיצ|מקבילים|דחיפ|כתפ|סוחבות|push-?up|bench press|press|dip|overhead|tricep/i.test(t)) {
      return 'push';
    }

    return null;
  }

  function extractExerciseGroup(item) {
    if (!item || typeof item !== 'object') return null;

    if (item.group) {
      const g = mapMuscleToGroup(item.group);
      if (g) return g;
    }
    if (item.pattern) {
      const g = mapMuscleToGroup(item.pattern);
      if (g) return g;
    }

    const primary =
      item.primary || item.muscle || item.target || (Array.isArray(item.muscles) ? item.muscles[0] : null);
    if (primary) {
      const g = mapMuscleToGroup(primary);
      if (g) return g;
    }

    const name = item.name || item.he || item.exerciseId || item.id || '';
    return inferGroupFromName(name);
  }

  function extractSecondaryGroups(item, primaryGroup) {
    const secondaryGroups = new Set();
    if (!item || typeof item !== 'object') return [];

    const rawList = [];
    if (item.secondaryGroup) rawList.push(item.secondaryGroup);
    if (item.indirectGroup) rawList.push(item.indirectGroup);
    if (Array.isArray(item.secondary)) rawList.push(...item.secondary);
    else if (typeof item.secondary === 'string') rawList.push(item.secondary);
    if (Array.isArray(item.secondaryMuscles)) rawList.push(...item.secondaryMuscles);

    for (const raw of rawList) {
      const g = mapMuscleToGroup(raw);
      if (g && g !== primaryGroup) {
        secondaryGroups.add(g);
      }
    }

    if (secondaryGroups.size === 0) {
      const name = normalizeText(item.name || item.he || item.exerciseId || item.id || '');
      if (/שכיבות סמיכה|push-?up|מקבילים|dips/.test(name)) {
        if (primaryGroup !== 'core') secondaryGroups.add('core');
      } else if (/סקוואט|squat|מכרעים|lunge|דדליפט|deadlift/.test(name)) {
        if (primaryGroup !== 'core') secondaryGroups.add('core');
      } else if (/מתח|pull-?up|חתירה|row/.test(name)) {
        if (primaryGroup !== 'core') secondaryGroups.add('core');
      }
    }

    return Array.from(secondaryGroups);
  }

  function parseSessionDate(session) {
    if (!session || typeof session !== 'object') return null;
    const raw = session.doneAt || session.at || session.date || session.loggedAt || session.timestamp || null;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function getReferenceTime(options) {
    if (options && (options.now || options.referenceDate)) {
      const parsed = new Date(options.now || options.referenceDate).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    return Date.now();
  }

  function extractExercisesFromSession(session) {
    const list = [];
    if (!session || typeof session !== 'object') return list;

    if (Array.isArray(session.phases)) {
      for (const ph of session.phases) {
        if (Array.isArray(ph?.exercises)) {
          for (const ex of ph.exercises) {
            if (ex) list.push(ex);
          }
        }
      }
      return list;
    }

    if (Array.isArray(session.exercises)) {
      for (const ex of session.exercises) {
        if (ex) list.push(ex);
      }
      return list;
    }

    if (Array.isArray(session.sets)) {
      for (const s of session.sets) {
        if (s) list.push(s);
      }
      return list;
    }

    if (Array.isArray(session.logs) || Array.isArray(session.loggedSets)) {
      const logs = session.logs || session.loggedSets;
      for (const l of logs) {
        if (l) list.push(l);
      }
      return list;
    }

    if (session.name || session.exerciseId || session.group || session.muscle) {
      list.push(session);
    }

    return list;
  }

  /**
   * Computes weekly balance for push, pull, legs, and core groups.
   * Direct sets: 1.0 each.
   * Indirect sets: 0.5 each.
   *
   * @param {Array|object} sessions
   * @param {object} [options]
   * @returns {object}
   */
  function computeMuscleGroupBalance(sessions, options) {
    const minSets = Number(options?.minWeeklySets) || MIN_EFFECTIVE_SETS;
    const overloadThreshold = Number(options?.overloadSets) || OVERLOAD_SETS;

    const groupTotals = {
      push: { direct: 0, indirect: 0 },
      pull: { direct: 0, indirect: 0 },
      legs: { direct: 0, indirect: 0 },
      core: { direct: 0, indirect: 0 }
    };

    let sessionList = [];
    if (Array.isArray(sessions)) {
      sessionList = sessions;
    } else if (sessions && typeof sessions === 'object') {
      sessionList = [sessions];
    }

    const refTime = getReferenceTime(options);
    let countedSessions = 0;

    for (const session of sessionList) {
      if (!session || typeof session !== 'object') continue;

      const sessionDate = parseSessionDate(session);
      if (sessionDate) {
        const diffDays = (refTime - sessionDate.getTime()) / (86400 * 1000);
        // Exclude sessions older than 7 days or more than 1 day in the future
        if (diffDays > 7.0001 || diffDays < -1) {
          continue;
        }
      }

      countedSessions += 1;
      const exercises = extractExercisesFromSession(session);

      for (const ex of exercises) {
        if (!ex) continue;

        let setCount = 1;
        if (typeof ex.sets === 'number' && Number.isFinite(ex.sets) && ex.sets >= 1) {
          setCount = ex.sets;
        } else if (Array.isArray(ex.sets)) {
          setCount = Math.max(1, ex.sets.length);
        } else if (typeof ex.setCount === 'number' && ex.setCount >= 1) {
          setCount = ex.setCount;
        }

        const primaryGroup = extractExerciseGroup(ex);
        if (primaryGroup && groupTotals[primaryGroup]) {
          groupTotals[primaryGroup].direct += setCount;
        }

        const secondaryGroups = extractSecondaryGroups(ex, primaryGroup);
        for (const sec of secondaryGroups) {
          if (groupTotals[sec] && sec !== primaryGroup) {
            groupTotals[sec].indirect += 0.5 * setCount;
          }
        }
      }
    }

    const groups = {};
    const keys = ['push', 'pull', 'legs', 'core'];
    let totalSetsAll = 0;

    for (const k of keys) {
      const d = Math.round(groupTotals[k].direct * 10) / 10;
      const ind = Math.round(groupTotals[k].indirect * 10) / 10;
      const tot = Math.round((d + ind) * 10) / 10;
      totalSetsAll += tot;

      const isDeficient = tot < minSets;
      const isOverloaded = tot >= overloadThreshold;
      const isBalanced = !isDeficient && !isOverloaded;

      let status = 'balanced';
      let statusHe = 'מאוזן';
      if (isDeficient) {
        status = 'deficient';
        statusHe = 'חסר';
      } else if (isOverloaded) {
        status = 'overloaded';
        statusHe = 'עמוס';
      }

      groups[k] = {
        key: k,
        label: GROUP_LABELS[k],
        direct: d,
        indirect: ind,
        total: tot,
        minTarget: minSets,
        overloadTarget: overloadThreshold,
        status: status,
        statusHe: statusHe,
        isDeficient: isDeficient,
        isOverloaded: isOverloaded,
        isBalanced: isBalanced
      };
    }

    const deficientGroups = keys.filter((k) => groups[k].isDeficient).sort((a, b) => groups[a].total - groups[b].total);

    const overloadedGroups = keys
      .filter((k) => groups[k].isOverloaded)
      .sort((a, b) => groups[b].total - groups[a].total);

    const balancedGroups = keys.filter((k) => groups[k].isBalanced);
    const isOverallBalanced = deficientGroups.length === 0;

    let summaryMessage = 'איזון שרירים שבועי מאוזן ותקין.';
    if (deficientGroups.length > 0) {
      const missingNames = deficientGroups.map((g) => GROUP_LABELS[g]).join(', ');
      summaryMessage = `זוהה חוסר שבועי בקבוצות: ${missingNames} (פחות מ-${minSets} סטים).`;
    } else if (overloadedGroups.length > 0) {
      const overloadedNames = overloadedGroups.map((g) => GROUP_LABELS[g]).join(', ');
      summaryMessage = `עומס גבוה בקבוצות: ${overloadedNames} (מעל ${overloadThreshold} סטים).`;
    }

    const result = {
      groups: groups,
      byGroup: groups,
      push: groups.push,
      pull: groups.pull,
      legs: groups.legs,
      core: groups.core,
      deficientGroups: deficientGroups,
      missingGroups: deficientGroups,
      lackingGroups: deficientGroups,
      overloadedGroups: overloadedGroups,
      balancedGroups: balancedGroups,
      isBalanced: isOverallBalanced,
      totalEffectiveSets: Math.round(totalSetsAll * 10) / 10,
      sessionsCount: countedSessions,
      message: summaryMessage
    };

    result.suggestedFocus = suggestNextFocus(result);
    return result;
  }

  /**
   * Suggests next workout focus based on computed muscle group balance.
   *
   * @param {object|Array} balance
   * @returns {object}
   */
  function suggestNextFocus(balance) {
    if (!balance || typeof balance !== 'object') {
      return {
        focus: 'full',
        group: 'full',
        label: 'אימון גוף מלא',
        shortLabel: 'גוף מלא',
        reason: 'אין נתוני אימונים קודמים, מומלץ להתחיל באימון גוף מלא מאוזן',
        message: 'מומלץ להתחיל באימון גוף מלא מאוזן',
        suggestedPrompt: 'אימון גוף מלא 20 דקות',
        targetMuscles: ['full']
      };
    }

    if (Array.isArray(balance)) {
      balance = computeMuscleGroupBalance(balance);
    }

    const deficient = Array.isArray(balance.deficientGroups) ? balance.deficientGroups : [];

    if (deficient.length > 0) {
      const focusGroup = deficient[0];
      const groupInfo = balance.groups?.[focusGroup] || { total: 0, direct: 0, indirect: 0 };

      const labelMap = {
        push: 'דחיפה (חזה/כתפיים/יד אחורית)',
        pull: 'משיכה (גב/יד קדמית)',
        legs: 'רגליים',
        core: 'ליבה ובטן'
      };

      const promptMap = {
        push: 'אימון דחיפה וחזה 20 דקות',
        pull: 'אימון משיכה וגב 20 דקות',
        legs: 'אימון רגליים 20 דקות',
        core: 'אימון ליבה ובטן 20 דקות'
      };

      const shortLabel = GROUP_LABELS[focusGroup] || focusGroup;
      const fullLabel = labelMap[focusGroup] || shortLabel;

      return {
        focus: focusGroup,
        group: focusGroup,
        label: fullLabel,
        shortLabel: shortLabel,
        reason: `קבוצת ה${shortLabel} מתחת ל-4 סטים שבועיים (${groupInfo.total} סטים)`,
        message: `מומלץ להתמקד ב${shortLabel} באימון הבא לאיזון שבועי`,
        suggestedPrompt: promptMap[focusGroup] || `אימון ${shortLabel} 20 דקות`,
        targetMuscles: [focusGroup]
      };
    }

    return {
      focus: 'full',
      group: 'full',
      label: 'גוף מלא / תחזוקה',
      shortLabel: 'גוף מלא',
      reason: 'כל קבוצות השרירים עמדו ביעד השבועי (4 סטים לפחות)',
      message: 'האיזון השבועי מצוין! מומלץ להמשיך באימון גוף מלא או פיצול שגרתי',
      suggestedPrompt: 'אימון גוף מלא 20 דקות',
      targetMuscles: ['full']
    };
  }

  const api = {
    computeMuscleGroupBalance: computeMuscleGroupBalance,
    suggestNextFocus: suggestNextFocus,
    mapMuscleToGroup: mapMuscleToGroup,
    inferGroupFromName: inferGroupFromName,
    GROUP_LABELS: GROUP_LABELS,
    MIN_EFFECTIVE_SETS: MIN_EFFECTIVE_SETS,
    OVERLOAD_SETS: OVERLOAD_SETS
  };

  if (root) {
    root.THMuscleBalance = api;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
