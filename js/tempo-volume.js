/**
 * Time Under Tension (TUT) and tempo-controlled volume calculator.
 * CommonJS / UMD compatible.
 */
((root) => {
  const DEFAULT_TEMPO = { eccentric: 3, pause: 1, concentric: 1 };

  function parseTempo(tempoVal) {
    let ecc = DEFAULT_TEMPO.eccentric;
    let pause = DEFAULT_TEMPO.pause;
    let con = DEFAULT_TEMPO.concentric;
    let pause2 = 0;

    if (typeof tempoVal === 'string') {
      const parts = tempoVal.split(/[-\s/]+/).map((p) => Number.parseInt(p, 10));
      if (parts.length >= 3 && !parts.some((n) => Number.isNaN(n) || n < 0)) {
        ecc = parts[0];
        pause = parts[1];
        con = parts[2];
        if (parts.length >= 4 && !Number.isNaN(parts[3]) && parts[3] >= 0) {
          pause2 = parts[3];
        }
      }
    } else if (tempoVal && typeof tempoVal === 'object') {
      if (typeof tempoVal.tempo === 'string' || typeof tempoVal.tempoPattern === 'string') {
        return parseTempo(tempoVal.tempo || tempoVal.tempoPattern);
      }
      const hasEcc = typeof tempoVal.eccentric === 'number' || typeof tempoVal.ecc === 'number';
      const hasPause =
        typeof tempoVal.pause === 'number' ||
        typeof tempoVal.iso === 'number' ||
        typeof tempoVal.isometric === 'number';
      const hasCon = typeof tempoVal.concentric === 'number' || typeof tempoVal.con === 'number';

      if (hasEcc || hasPause || hasCon) {
        ecc = Math.max(0, Number(tempoVal.eccentric ?? tempoVal.ecc ?? 0));
        pause = Math.max(0, Number(tempoVal.pause ?? tempoVal.iso ?? tempoVal.isometric ?? 0));
        con = Math.max(0, Number(tempoVal.concentric ?? tempoVal.con ?? 0));
        pause2 = Math.max(0, Number(tempoVal.topPause ?? tempoVal.pause2 ?? 0));
      }
    } else if (typeof tempoVal === 'number' && Number.isFinite(tempoVal) && tempoVal > 0) {
      return { eccentric: tempoVal, pause: 0, concentric: 0, topPause: 0, totalPerRep: tempoVal };
    }

    const totalPerRep = ecc + pause + con + pause2;
    return {
      eccentric: ecc,
      pause: pause,
      concentric: con,
      topPause: pause2,
      totalPerRep: totalPerRep
    };
  }

  function computeSetTimeUnderTension(reps, tempoObj) {
    if (reps == null) return 0;
    const numReps = Number(reps);
    if (!Number.isFinite(numReps) || numReps <= 0) return 0;

    const pattern = parseTempo(tempoObj);
    const secPerRep = pattern.totalPerRep;
    if (secPerRep <= 0) return 0;

    return Math.max(0, Math.round(numReps * secPerRep));
  }

  function summarizeSessionTutSeconds(setsList) {
    if (!setsList) return 0;
    let list = setsList;
    if (!Array.isArray(setsList)) {
      if (Array.isArray(setsList.exercises)) {
        list = setsList.exercises;
      } else if (Array.isArray(setsList.phases)) {
        list = [];
        setsList.phases.forEach((ph) => {
          (ph.exercises || []).forEach((ex) => {
            if (ex) list.push(ex);
          });
        });
      } else {
        return 0;
      }
    }

    let totalSeconds = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;

      const setCountRaw = Number(item.sets);
      const setCount = Number.isFinite(setCountRaw) && setCountRaw > 0 ? setCountRaw : 1;

      const durRaw = Number(item.duration_seconds ?? item.duration);
      if (Number.isFinite(durRaw) && durRaw > 0) {
        totalSeconds += setCount * durRaw;
        continue;
      }

      const repsRaw = item.reps ?? item.actualReps;
      if (repsRaw != null) {
        let r = Number(repsRaw);
        if (Number.isNaN(r) && typeof repsRaw === 'string') {
          const m = repsRaw.match(/(\d+)\s*[-–—−]\s*(\d+)/);
          if (m) {
            r = (Number(m[1]) + Number(m[2])) / 2;
          } else {
            r = Number.parseInt(repsRaw, 10);
          }
        }
        if (Number.isFinite(r) && r > 0) {
          const tempoVal = item.tempo ?? item.tempoPattern ?? item.tempoObj ?? item;
          const tutPerSet = computeSetTimeUnderTension(r, tempoVal);
          totalSeconds += setCount * tutPerSet;
        }
      }
    }

    return Math.max(0, Math.round(totalSeconds));
  }

  function summarizeSessionTut(setsList) {
    const totalSeconds = summarizeSessionTutSeconds(setsList);
    return Math.max(0, Math.round(totalSeconds / 60));
  }

  const api = {
    DEFAULT_TEMPO: DEFAULT_TEMPO,
    parseTempo: parseTempo,
    computeSetTimeUnderTension: computeSetTimeUnderTension,
    summarizeSessionTut: summarizeSessionTut,
    summarizeSessionTutSeconds: summarizeSessionTutSeconds
  };

  root.THTempoVolume = api;
  root.computeSetTimeUnderTension = computeSetTimeUnderTension;
  root.summarizeSessionTut = summarizeSessionTut;

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
