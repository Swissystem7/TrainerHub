((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THWeeklyDigest = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  function buildWeeklyDigest(sessions, plannedCount) {
    var list = Array.isArray(sessions) ? sessions : [];
    var planned = Math.max(0, Number(plannedCount) || 0);
    var completed = list.length;
    var totalVolume = list.reduce((acc, s) => {
      var exs = s.exercises || (s.phases ? s.phases.flatMap((p) => p.exercises || []) : []);
      return (
        acc +
        exs.reduce((exAcc, x) => {
          var sets = Number(x.sets) || 1;
          var reps = Number(String(x.reps || '0').split('-')[0]) || 0;
          return exAcc + sets * reps;
        }, 0)
      );
    }, 0);

    var muscles = {};
    list.forEach((s) => {
      var m = s.muscle || s.split || 'full';
      muscles[m] = (muscles[m] || 0) + 1;
    });

    var focus = completed >= planned ? 'שמירה על קצב והעמסה تدريجية' : 'השלמת אימונים חסרים ומתן דגש על התאוששות';

    return {
      completed: completed,
      planned: planned,
      totalVolume: totalVolume,
      muscles: muscles,
      focus: focus
    };
  }

  function digestHtml(digest) {
    return (
      '<div id="weeklyDigestCard" class="weekly-digest-card">' +
      '<h3>סיכום שבועי</h3>' +
      '<p>הושלמו ' +
      digest.completed +
      ' מתוך ' +
      digest.planned +
      ' אימונים מתוכננים.</p>' +
      '<p>נפח כולל (חזרות × סטים): ' +
      digest.totalVolume +
      '</p>' +
      '<p>המלצת מיקוד: ' +
      digest.focus +
      '</p>' +
      '<button type="button" id="printWeeklyDigestBtn">הדפס דוח שבועי</button>' +
      '</div>'
    );
  }

  function digestPrintHtml(digest) {
    return (
      '<div id="weeklyDigestPrintView" class="weekly-digest-print-view">' +
      '<h3>סיכום שבועי</h3>' +
      '<p>הושלמו ' +
      digest.completed +
      ' מתוך ' +
      digest.planned +
      ' אימונים מתוכננים.</p>' +
      '<p>נפח כולל (חזרות × סטים): ' +
      digest.totalVolume +
      '</p>' +
      '<p>המלצת מיקוד: ' +
      digest.focus +
      '</p>' +
      '</div>'
    );
  }

  function initWeeklyDigestUI(containerId, sessions, plannedCount) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var digest = buildWeeklyDigest(sessions, plannedCount);
    container.innerHTML = digestHtml(digest);
  }

  return {
    buildWeeklyDigest: buildWeeklyDigest,
    digestHtml: digestHtml,
    digestPrintHtml: digestPrintHtml,
    initWeeklyDigestUI: initWeeklyDigestUI
  };
});
