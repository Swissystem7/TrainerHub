/**
 * Live tempo cues and smart rest countdown alerts.
 * CommonJS / UMD compatible.
 */
((root) => {
  function parseTempoPattern(tempoVal) {
    let ecc = 3;
    let pause = 1;
    let con = 1;

    if (typeof tempoVal === 'string') {
      const parts = tempoVal.split(/[-\s/]+/).map((p) => Number.parseInt(p, 10));
      if (parts.length >= 3 && !parts.some((n) => Number.isNaN(n) || n < 0)) {
        ecc = parts[0];
        pause = parts[1];
        con = parts[2];
      }
    } else if (tempoVal && typeof tempoVal === 'object') {
      if (typeof tempoVal.eccentric === 'number' && tempoVal.eccentric >= 0) ecc = tempoVal.eccentric;
      if (typeof tempoVal.pause === 'number' && tempoVal.pause >= 0) pause = tempoVal.pause;
      if (typeof tempoVal.concentric === 'number' && tempoVal.concentric >= 0) con = tempoVal.concentric;
    }
    return { eccentric: ecc, pause: pause, concentric: con };
  }

  function getTempoCueForPhase(exercise, elapsedMs) {
    if (!exercise || typeof elapsedMs !== 'number' || elapsedMs < 0 || !Number.isFinite(elapsedMs)) {
      return '';
    }

    const tempoVal =
      typeof exercise === 'string'
        ? exercise
        : exercise.tempo || exercise.tempoPattern || (exercise.notes?.includes('טמפו') ? exercise.notes : null);

    const pattern = parseTempoPattern(tempoVal);
    const eccMs = pattern.eccentric * 1000;
    const pauseMs = pattern.pause * 1000;
    const conMs = pattern.concentric * 1000;
    const cycleMs = eccMs + pauseMs + conMs;

    if (cycleMs <= 0) {
      return 'עלייה מבוקרת';
    }

    const posMs = elapsedMs % cycleMs;

    if (posMs < eccMs) {
      return pattern.eccentric === 3 ? 'ירידה איטית 3 שניות' : `ירידה איטית ${pattern.eccentric} שניות`;
    }
    if (posMs < eccMs + pauseMs) {
      return 'עצירה בתחתית';
    }
    return 'עלייה מבוקרת';
  }

  function getRestCountdownAlert(remainingSeconds, soundEnabled, storage) {
    let effectiveSound = true;
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);

    if (soundEnabled !== undefined && soundEnabled !== null) {
      effectiveSound = Boolean(soundEnabled);
      try {
        if (store && typeof store.setItem === 'function') {
          store.setItem('trainerhub_rest_sound_preference', JSON.stringify(effectiveSound));
        }
      } catch (_err) {
        // Silently tolerate storage errors
      }
    } else {
      try {
        if (store && typeof store.getItem === 'function') {
          const saved = store.getItem('trainerhub_rest_sound_preference');
          if (saved !== null) {
            effectiveSound = JSON.parse(saved) === true;
          }
        }
      } catch (_err) {
        effectiveSound = true;
      }
    }

    const isNumeric = typeof remainingSeconds === 'number' && Number.isFinite(remainingSeconds);
    const isLast3 = isNumeric && remainingSeconds > 0 && remainingSeconds <= 3;
    const sec = isLast3 ? Math.ceil(remainingSeconds) : 0;

    let text = '';
    if (isLast3) {
      text = sec === 1 ? 'סיום מנוחה בעוד שנייה אחת!' : `סיום מנוחה בעוד ${sec} שניות!`;
    }

    return {
      alert: isLast3,
      isAlert: isLast3,
      active: isLast3,
      remainingSeconds: isNumeric && remainingSeconds >= 0 ? remainingSeconds : 0,
      sound: effectiveSound,
      soundEnabled: effectiveSound,
      beep: isLast3 && effectiveSound,
      text: text,
      message: text,
      cue: text,
      toString() {
        return this.text;
      }
    };
  }

  function patchLiveWorkout(liveApi) {
    if (!liveApi || liveApi.__tempoPatched) return;
    liveApi.__tempoPatched = true;

    const origCreate = liveApi.createLiveSession;
    if (typeof origCreate === 'function') {
      liveApi.createLiveSession = function (workout, ...args) {
        const session = origCreate.apply(this, [workout, ...args]);
        if (session && Array.isArray(session.exercises) && workout) {
          const rawExercises = Array.isArray(workout)
            ? workout
            : Array.isArray(workout.exercises)
              ? workout.exercises
              : [];
          session.exercises.forEach((ex, idx) => {
            const raw = rawExercises[idx] || {};
            ex.tempo = raw.tempo || workout.tempo || null;
          });
        }
        return session;
      };
    }

    const origLog = liveApi.logSetAndAdvance;
    if (typeof origLog === 'function') {
      liveApi.logSetAndAdvance = function (state, entry, ...args) {
        const currentEx = state && Array.isArray(state.exercises) ? state.exercises[state.currentExerciseIndex] : null;
        const res = origLog.apply(this, [state, entry, ...args]);
        if (res && Array.isArray(res.loggedSets) && res.loggedSets.length > 0) {
          const lastRecord = res.loggedSets[res.loggedSets.length - 1];
          if (lastRecord && lastRecord.tempo === undefined) {
            lastRecord.tempo = (entry && entry.tempo != null ? entry.tempo : currentEx?.tempo) || null;
          }
        }
        return res;
      };
    }
  }

  // CommonJS patching
  if (typeof require === 'function') {
    try {
      const lw = require('./live-workout.js');
      patchLiveWorkout(lw);
    } catch (_e) {}
  }

  // Browser / UMD patching
  if (root?.THLiveWorkout) {
    patchLiveWorkout(root.THLiveWorkout);
    if (root.createLiveSession) root.createLiveSession = root.THLiveWorkout.createLiveSession;
    if (root.logSetAndAdvance) root.logSetAndAdvance = root.THLiveWorkout.logSetAndAdvance;
  }

  const api = {
    getTempoCueForPhase: getTempoCueForPhase,
    getRestCountdownAlert: getRestCountdownAlert,
    parseTempoPattern: parseTempoPattern,
    patchLiveWorkout: patchLiveWorkout
  };

  if (root) {
    root.THLiveTempoCue = api;
    root.getTempoCueForPhase = getTempoCueForPhase;
    root.getRestCountdownAlert = getRestCountdownAlert;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
