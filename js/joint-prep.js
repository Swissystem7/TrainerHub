/**
 * Joint Warm-Check Protocol (בדיקת תנועה מכינה למפרקים)
 * CommonJS / UMD compatible.
 */
((root) => {
  const UPPER_BODY_CHECKS = [
    {
      id: 'shoulder-rotations',
      name: 'סיבובי כתפיים מבוקרים',
      joint: 'shoulder',
      jointHe: 'כתף',
      instruction: 'בצע 5 סיבובים קדימה ו-5 אחורה לווידוא תנועה חלקה ללא כאב.',
      reps: 5
    },
    {
      id: 'overhead-reach-check',
      name: 'פשיטת ידיים מעלה מעבר לראש',
      joint: 'shoulder',
      jointHe: 'כתף',
      instruction: 'הרם את שתי הידיים מעל הראש ובדוק שאין צביטה או אי-נוחות בכתף.',
      reps: 5
    },
    {
      id: 'horizontal-abduction-check',
      name: 'פתיחת זרועות לצדדים (קירוב שכמות)',
      joint: 'shoulder',
      jointHe: 'כתף',
      instruction: 'פתח ידיים לצדדים עם מתיחה קלה לחזה ובדוק יציבות וחופש תנועה במפרק הכתף.',
      reps: 5
    }
  ];

  const LEGS_CHECKS = [
    {
      id: 'knee-flexion-extension',
      name: 'כיפוף ויישור ברך בעמידה',
      joint: 'knee',
      jointHe: 'ברך',
      instruction: 'כופף ויישר כל ברך לסירוגין 5 פעמים כדי לבדוק גמישות וחוסר נוקשות.',
      reps: 5
    },
    {
      id: 'bodyweight-squat-check',
      name: 'סקווט בדיקה במשקל גוף',
      joint: 'knee',
      jointHe: 'ברך',
      instruction: 'רד לסקווט חלקי עד בינוני ובדוק שאין לחץ חריג או אי-נוחות במפרק הברך.',
      reps: 5
    },
    {
      id: 'ankle-knee-mobility-check',
      name: 'הנעת ברך קדימה מעל בהונות',
      joint: 'knee',
      jointHe: 'ברך',
      instruction: 'הנח רגל קדימה והנע את הברך קדימה באיטיות לבדיקת טווח מפרק הברך והקרסול.',
      reps: 5
    }
  ];

  const BACK_CHECKS = [
    {
      id: 'gentle-spinal-rotation',
      name: 'פיתול עדין של עמוד השדרה והגב',
      joint: 'back',
      jointHe: 'גב',
      instruction: 'עמוד זקוף וסובב את פלג הגוף העליון ימינה ושמאלה לבדיקת חופש תנועה בגב.',
      reps: 5
    },
    {
      id: 'hip-hinge-back-check',
      name: 'ציר ירך עדין לבדיקת גב תחתון',
      joint: 'back',
      jointHe: 'גב',
      instruction: 'שלח ישבן לאחור עם גב ישר ובדוק שאין אי-נוחות בעמוד השדרה.',
      reps: 5
    },
    {
      id: 'cat-cow-standing-check',
      name: 'קיעור וקימור גב עדין',
      joint: 'back',
      jointHe: 'גב',
      instruction: 'קמר וקער את הגב בעמידה עם ידיים על הירכיים לווידוא תנועתיות מפרקי עמוד השדרה.',
      reps: 5
    }
  ];

  const GENERAL_CHECKS = [
    {
      id: 'shoulder-rotations',
      name: 'סיבובי כתפיים מבוקרים',
      joint: 'shoulder',
      jointHe: 'כתף',
      instruction: 'בצע 5 סיבובים קדימה ו-5 אחורה לווידוא תנועה חלקה ללא כאב בכתפיים.',
      reps: 5
    },
    {
      id: 'bodyweight-squat-check',
      name: 'סקווט בדיקה במשקל גוף',
      joint: 'knee',
      jointHe: 'ברך',
      instruction: 'רד לסקווט חלקי לבדיקת חופש תנועה ונוחות במפרקי הברכיים.',
      reps: 5
    },
    {
      id: 'gentle-spinal-rotation',
      name: 'פיתול עדין של עמוד השדרה והגב',
      joint: 'back',
      jointHe: 'גב',
      instruction: 'סובב את פלג הגוף העליון ימינה ושמאלה לבדיקת חופש תנועה בגב.',
      reps: 5
    }
  ];

  const normalizeMuscles = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item.toLowerCase().trim()];
        if (typeof item === 'object') {
          if (Array.isArray(item.muscles)) return item.muscles.map((m) => String(m).toLowerCase().trim());
          if (typeof item.muscle === 'string') return [item.muscle.toLowerCase().trim()];
        }
        return [String(item).toLowerCase().trim()];
      });
    }
    if (typeof raw === 'object') {
      if (Array.isArray(raw.muscles)) return normalizeMuscles(raw.muscles);
      if (typeof raw.muscle === 'string') return [raw.muscle.toLowerCase().trim()];
      if (Array.isArray(raw.phases)) {
        const extracted = [];
        for (const ph of raw.phases) {
          for (const ex of ph.exercises || []) {
            if (ex?.muscles) extracted.push(...normalizeMuscles(ex.muscles));
            else if (ex?.muscle) extracted.push(ex.muscle.toLowerCase().trim());
          }
        }
        return extracted;
      }
    }
    if (typeof raw === 'string') {
      return raw
        .split(/[,/|;\s]+/)
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean);
    }
    return [];
  };

  const getJointPrepChecks = (workoutMuscles) => {
    const list = normalizeMuscles(workoutMuscles);
    if (!list.length) {
      return GENERAL_CHECKS.map((c) => ({ ...c }));
    }

    let legScore = 0;
    let upperScore = 0;
    let backScore = 0;

    for (const m of list) {
      if (/רגליים|ישבן|ירכיים|ארבע|שוק|ברך|תחתון|leg|glute|quad|hamstring|calf|lower/.test(m)) {
        legScore += 1;
      } else if (
        /חזה|כתפ|ידיים|זרוע|דו־ראשי|דו-ראשי|תלת־ראשי|תלת-ראשי|שכמ|עליון|chest|shoulder|bicep|tricep|arm|upper/.test(m)
      ) {
        upperScore += 1;
      } else if (/גב|עמוד שדרה|ליבה|מותן|back|spine|core/.test(m)) {
        backScore += 1;
      }
    }

    if (legScore > upperScore && legScore >= backScore) {
      return LEGS_CHECKS.map((c) => ({ ...c }));
    }
    if (upperScore >= legScore && upperScore >= backScore && upperScore > 0) {
      return UPPER_BODY_CHECKS.map((c) => ({ ...c }));
    }
    if (backScore > 0) {
      return BACK_CHECKS.map((c) => ({ ...c }));
    }

    return GENERAL_CHECKS.map((c) => ({ ...c }));
  };

  const hasDiscomfort = (results) => {
    if (!results) return false;
    if (results === true) return true;
    if (typeof results === 'string') {
      const s = results.toLowerCase();
      return (
        s.includes('discomfort') ||
        s.includes('pain') ||
        s.includes('אי-נוחות') ||
        s.includes('אי נוחות') ||
        s.includes('כאב')
      );
    }
    if (Array.isArray(results)) {
      return results.some((item) => {
        if (!item) return false;
        if (item === true) return true;
        if (typeof item === 'string') {
          const s = item.toLowerCase();
          return (
            s.includes('discomfort') ||
            s.includes('pain') ||
            s.includes('אי-נוחות') ||
            s.includes('אי נוחות') ||
            s.includes('כאב')
          );
        }
        if (typeof item === 'object') {
          if (item.discomfort === true || item.hasDiscomfort === true || item.pain === true) return true;
          if (item.ok === false || item.comfortable === false || item.passed === false) return true;
          if (typeof item.status === 'string') {
            const s = item.status.toLowerCase();
            if (
              s.includes('discomfort') ||
              s.includes('pain') ||
              s.includes('אי-נוחות') ||
              s.includes('אי נוחות') ||
              s.includes('כאב')
            ) {
              return true;
            }
          }
        }
        return false;
      });
    }
    if (typeof results === 'object') {
      if (results.discomfort === true || results.hasDiscomfort === true || results.pain === true) return true;
      if (results.ok === false || results.comfortable === false || results.passed === false) return true;
      if (typeof results.status === 'string') {
        const s = results.status.toLowerCase();
        if (
          s.includes('discomfort') ||
          s.includes('pain') ||
          s.includes('אי-נוחות') ||
          s.includes('אי נוחות') ||
          s.includes('כאב')
        ) {
          return true;
        }
      }
      for (const key of Object.keys(results)) {
        const val = results[key];
        if (val === true && (key.includes('discomfort') || key.includes('pain') || key.includes('limit'))) return true;
        if (val === false && (key.includes('ok') || key.includes('comfort') || key.includes('pass'))) return true;
      }
    }
    return false;
  };

  const resolvePrepCheckOutcome = (checksResults) => {
    const isDiscomfort = hasDiscomfort(checksResults);
    if (isDiscomfort) {
      return {
        status: 'adjust_rom',
        action: 'adjust_rom',
        mode: 'safe_rom',
        adjustRom: true,
        safeRangeOfMotion: true,
        discomfortReported: true,
        recommendation: 'הפעלת התאמת טווח תנועה בטוחה',
        recommendationHe: 'הפעלת התאמת טווח תנועה בטוחה',
        message: 'דווחה אי-נוחות במפרק: מומלץ להפעיל התאמת טווח תנועה בטוחה ולהימנע מעומס קיצוני.'
      };
    }
    return {
      status: 'full_workout',
      action: 'full_workout',
      mode: 'full',
      adjustRom: false,
      safeRangeOfMotion: false,
      discomfortReported: false,
      recommendation: 'מעבר לאימון מלא',
      recommendationHe: 'מעבר לאימון מלא',
      message: 'בדיקת המפרקים תקינה: מעבר לאימון מלא בעצימות המתוכננת.'
    };
  };

  const api = {
    getJointPrepChecks,
    resolvePrepCheckOutcome,
    UPPER_BODY_CHECKS,
    LEGS_CHECKS,
    BACK_CHECKS,
    GENERAL_CHECKS
  };

  if (root) {
    root.THJointPrep = api;
    root.getJointPrepChecks = getJointPrepChecks;
    root.resolvePrepCheckOutcome = resolvePrepCheckOutcome;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
