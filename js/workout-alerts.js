((root, factory) => {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THWorkoutAlerts = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  function prefersReducedMotion(win) {
    try {
      const w = win || (typeof window !== 'undefined' ? window : null);
      if (!w?.matchMedia) return false;
      return w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_err) {
      return false;
    }
  }

  function triggerRestCompleteAlert(options, env) {
    const opts = options || {};
    const win = env?.window || (typeof window !== 'undefined' ? window : null);
    const nav = env?.navigator || (typeof navigator !== 'undefined' ? navigator : null);

    if (opts.enabled === false) return { triggered: false, reason: 'disabled' };
    if (prefersReducedMotion(win)) return { triggered: false, reason: 'reduced-motion' };

    let vibrated = false;
    if (nav && typeof nav.vibrate === 'function') {
      try {
        const pattern = opts.vibratePattern || [200, 100, 200];
        vibrated = nav.vibrate(pattern);
      } catch (_e) {
        vibrated = false;
      }
    }

    let beeped = false;
    if (win && (win.AudioContext || win.webkitAudioContext)) {
      try {
        const AudioCtx = win.AudioContext || win.webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
          audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
        beeped = true;
      } catch (_err) {
        beeped = false;
      }
    }

    return { triggered: true, vibrated, beeped };
  }

  function saveAlertPreferences(prefs, storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || typeof store.setItem !== 'function') return false;
    try {
      store.setItem('trainerhub_alert_prefs', JSON.stringify(prefs || {}));
      return true;
    } catch (_err) {
      return false;
    }
  }

  function loadAlertPreferences(storage) {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!store || typeof store.getItem !== 'function') return {};
    try {
      const raw = store.getItem('trainerhub_alert_prefs');
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (_err) {
      return {};
    }
  }

  function initWorkoutAlertsUI(storage, doc) {
    const d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || typeof d.getElementById !== 'function') return;
    const toggle = d.getElementById('fieldAlertToggle');
    if (!toggle) return;
    try {
      const prefs = loadAlertPreferences(storage);
      if (typeof prefs.enabled === 'boolean') {
        toggle.checked = prefs.enabled;
      }
    } catch (_e) {}

    toggle.addEventListener('change', () => {
      saveAlertPreferences({ enabled: toggle.checked }, storage);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initWorkoutAlertsUI());
    } else {
      initWorkoutAlertsUI();
    }
  }

  return {
    triggerRestCompleteAlert,
    saveAlertPreferences,
    loadAlertPreferences,
    prefersReducedMotion,
    initWorkoutAlertsUI
  };
});
