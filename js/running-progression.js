((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THRunningProgression = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  function parseTimeInput(val) {
    if (typeof val === 'number') {
      return Number.isNaN(val) || val <= 0 ? 14.0 : val;
    }
    if (typeof val !== 'string') return 14.0;
    var trimmed = val.trim();
    if (!trimmed) return 14.0;
    if (trimmed.indexOf(':') !== -1) {
      var parts = trimmed.split(':');
      var m = parseFloat(parts[0]);
      var s = parseFloat(parts[1]);
      if (Number.isNaN(m) || Number.isNaN(s)) return 14.0;
      var total = m + s / 60.0;
      return total > 0 ? total : 14.0;
    }
    var num = parseFloat(trimmed);
    return !Number.isNaN(num) && num > 0 ? num : 14.0;
  }

  function formatPace(minPerKm) {
    var m = Math.floor(minPerKm);
    var s = Math.round((minPerKm - m) * 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function buildSixWeekRunPlan(threeKmMinutes) {
    var mins = parseTimeInput(threeKmMinutes);
    var basePaceMinPerKm = mins / 3.0;
    var weeks = [];
    for (var w = 1; w <= 6; w++) {
      var factor = 1.25 - w * 0.03;
      if (w === 6) factor = 1.15; // taper
      var paceTempo = Math.round(basePaceMinPerKm * 1.05 * factor * 100) / 100;
      var paceInterval = Math.round(basePaceMinPerKm * 0.95 * factor * 100) / 100;
      var paceEasy = Math.round(basePaceMinPerKm * 1.15 * factor * 100) / 100;

      weeks.push({
        week: w,
        sessions: [
          {
            dayHe: 'יום ראשון',
            typeHe: 'ריצת קצב',
            pace: formatPace(paceTempo),
            targetPace: paceTempo,
            distanceKm: Math.min(4 + w * 0.5, 8),
            descriptionHe: 'ריצת קצב רציפה בקצב מטרה מדורג'
          },
          {
            dayHe: 'יום שלישי',
            typeHe: 'אינטרוולים',
            pace: formatPace(paceInterval),
            targetPace: paceInterval,
            distanceKm: Math.min(3 + w * 0.4, 7),
            descriptionHe: 'אינטרוולים מהירים עם התאוששות קלה'
          },
          {
            dayHe: 'יום חמישי',
            typeHe: 'נפח קל',
            pace: formatPace(paceEasy),
            targetPace: paceEasy,
            distanceKm: Math.min(5 + w * 0.6, 10),
            descriptionHe: 'ריצת נפח בקצב קל ודיבור'
          }
        ]
      });
    }
    return {
      baseMinutes: mins,
      basePace: Math.round(basePaceMinPerKm * 100) / 100,
      weeks: weeks
    };
  }

  function mergeRunDaysWithStrength(runPlan, strengthDays) {
    if (!runPlan || !Array.isArray(runPlan.weeks)) return runPlan;
    var heavyDays = Array.isArray(strengthDays) ? strengthDays : ['יום שלישי', 'יום ראשון'];
    runPlan.weeks.forEach((week) => {
      if (Array.isArray(week.sessions)) {
        week.sessions.forEach((session) => {
          if (
            heavyDays.indexOf(session.dayHe) !== -1 &&
            session.typeHe &&
            session.typeHe.indexOf('אינטרוולים') !== -1
          ) {
            session.dayHe = 'יום רביעי';
            session.noteHe = 'הוזז למניעת עומס עם אימון כוח';
          }
        });
      }
    });
    return runPlan;
  }

  // Auto-wire UI if running in browser
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      var btn = document.getElementById('generateRunPlanBtn');
      var panel = document.getElementById('runningPlanPanel');
      var slots = document.getElementById('weeklyRunningSlots');
      if (btn && panel) {
        btn.addEventListener('click', () => {
          var inputEl = document.getElementById('threeKmInput');
          var val = inputEl ? inputEl.value : 13.5;
          var plan = buildSixWeekRunPlan(val);
          panel.innerHTML = `<pre>${JSON.stringify(plan, null, 2)}</pre>`;
        });
      }
      if (slots) {
        var defaultPlan = buildSixWeekRunPlan(13.5);
        slots.innerHTML = `<div>תכנית ריצה 6 שבועות: ${defaultPlan.weeks.length} שבועות</div>`;
      }
    });
  }

  return {
    parseTimeInput: parseTimeInput,
    formatPace: formatPace,
    buildSixWeekRunPlan: buildSixWeekRunPlan,
    mergeRunDaysWithStrength: mergeRunDaysWithStrength
  };
});
