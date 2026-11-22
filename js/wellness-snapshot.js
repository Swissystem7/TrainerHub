((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THWellnessSnapshot = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  function buildWellnessSnapshot(avgSleepHours, energyRating) {
    var sleep = Number(avgSleepHours);
    if (Number.isNaN(sleep) || sleep < 0) sleep = 0;
    if (sleep > 14) sleep = 14;

    var energy = Number(energyRating);
    if (Number.isNaN(energy) || energy < 1) energy = 1;
    if (energy > 5) energy = 5;

    var status = 'steady';
    var recommendation = 'המשיכו בקצב הרגיל ושמרו על עקביות.';

    if (sleep >= 7 && energy >= 4) {
      status = 'optimal';
      recommendation = 'מוכנות מעולה! אפשר לשמור על עומס מלא או לנסות התקדמות קלה בנפח/משקל.';
    } else if (sleep < 6 || energy <= 2) {
      status = 'reduce_load';
      recommendation =
        'זוהה עייפות או חוסר שינה ניכר. מומלץ לבצע פריקה (Deload) או להפחית כ־30%-40% מהסטים באימון הקרוב.';
    } else {
      status = 'steady';
      recommendation = 'מוכנות בינונית. שימו לב להתאוששות ושמרו על רמת עומס יציבה.';
    }

    return {
      avgSleepHours: sleep,
      energyRating: energy,
      status: status,
      recommendation: recommendation,
      timestamp: new Date().toISOString()
    };
  }

  function saveWellnessSnapshot(snapshot, storage) {
    var store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || typeof store.setItem !== 'function') {
      return false;
    }
    try {
      store.setItem('trainerhub_wellness_weekly', JSON.stringify(snapshot));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function initWellnessWidget(sleepInputId, energyInputId, resultContainerId) {
    var sleepEl = typeof document !== 'undefined' ? document.getElementById(sleepInputId) : null;
    var energyEl = typeof document !== 'undefined' ? document.getElementById(energyInputId) : null;
    var resultEl = typeof document !== 'undefined' ? document.getElementById(resultContainerId) : null;

    if (!sleepEl || !energyEl || !resultEl) return;

    function update() {
      var snap = buildWellnessSnapshot(sleepEl.value, energyEl.value);
      resultEl.textContent = snap.recommendation;
      saveWellnessSnapshot(snap);
    }

    sleepEl.addEventListener('input', update);
    energyEl.addEventListener('input', update);
    update();
  }

  return {
    buildWellnessSnapshot: buildWellnessSnapshot,
    saveWellnessSnapshot: saveWellnessSnapshot,
    initWellnessWidget: initWellnessWidget
  };
});
