((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    const exports = factory();
    root.THFocusLockUI = exports;
    root.requestScreenWakeLock = exports.requestScreenWakeLock;
    root.computeSessionProgressBar = exports.computeSessionProgressBar;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, () => {
  async function requestScreenWakeLock(navigatorObj) {
    try {
      const nav = navigatorObj !== undefined ? navigatorObj : typeof navigator !== 'undefined' ? navigator : null;
      if (!nav?.wakeLock || typeof nav.wakeLock.request !== 'function') {
        return null;
      }
      const sentinel = await nav.wakeLock.request('screen');
      return sentinel || null;
    } catch (_err) {
      return null;
    }
  }

  function computeSessionProgressBar(completedSets, totalSets) {
    const c = Number.isFinite(Number(completedSets)) ? Number(completedSets) : 0;
    const t = Number.isFinite(Number(totalSets)) ? Number(totalSets) : 0;

    let percent = 0;
    if (t > 0) {
      percent = Math.round((c / t) * 100);
    }
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    const text = `סט ${c} מתוך ${t}`;

    return {
      percent,
      percentage: percent,
      text,
      statusText: text,
      completed: c,
      total: t
    };
  }

  return {
    requestScreenWakeLock,
    computeSessionProgressBar
  };
});
