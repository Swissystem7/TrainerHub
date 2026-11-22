((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THBenchmarkCheckin = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  var STORAGE_KEY = 'trainerhub_benchmarks';

  function compareBiWeeklyBenchmark(previousEntry, currentEntry) {
    if (!previousEntry || !currentEntry) {
      return { trend: 'steady', scoreDiff: 0, message: 'אין מספיק נתונים להשוואה דו-שבועית.' };
    }

    var prevScore = Number(previousEntry.score || previousEntry.total || 0);
    var currScore = Number(currentEntry.score || currentEntry.total || 0);
    var diff = currScore - prevScore;

    var trend = 'steady';
    if (diff > 0) {
      trend = 'improving';
    } else if (diff < 0) {
      trend = 'needs_adjustment';
    }

    var message =
      trend === 'improving'
        ? 'יש שיפור חיובי בביצועים לעומת נקודת הביקורת הקודמת.'
        : trend === 'needs_adjustment'
          ? 'זוהתה ירידה קלה בביצועים. מומלץ לבחון עומס או התאוששות.'
          : 'הביצועים יציבים וללא שינוי משמעותי.';

    return {
      trend: trend,
      scoreDiff: diff,
      message: message
    };
  }

  function saveBenchmarkEntry(entry, storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return false;
    try {
      var raw = store.getItem(STORAGE_KEY);
      var list = [];
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }
      list.push(Object.assign({ at: new Date().toISOString() }, entry || {}));
      store.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (_e) {
      return false;
    }
  }

  function listBenchmarkEntries(storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store) return [];
    try {
      var raw = store.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function initBenchmarkUI() {
    var panel = document.getElementById('biWeeklyBenchmarkPanel');
    if (!panel) return;
    var entries = listBenchmarkEntries();
    var html = '<h3>מעקב דו-שבועי</h3>';
    if (entries.length >= 2) {
      var comparison = compareBiWeeklyBenchmark(entries[entries.length - 2], entries[entries.length - 1]);
      html += `<p>${comparison.message} (הפרש: ${comparison.scoreDiff})</p>`;
    } else {
      html += '<p>אין מספיק נתונים להשוואה דו-שבועית.</p>';
    }
    panel.innerHTML = html;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBenchmarkUI);
    } else {
      initBenchmarkUI();
    }
  }

  return {
    compareBiWeeklyBenchmark: compareBiWeeklyBenchmark,
    saveBenchmarkEntry: saveBenchmarkEntry,
    listBenchmarkEntries: listBenchmarkEntries,
    initBenchmarkUI: initBenchmarkUI
  };
});
