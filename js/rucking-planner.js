((root, factory) => {
  const api = factory();
  if (typeof define === 'function' && define.amd) {
    define([], () => api);
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.THRucking = api;
    root.RuckingPlanner = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const MIN_PACK_RATIO = 0.1;
  const MAX_PACK_RATIO = 0.15;
  const WEEKLY_TIME_FACTOR = 1.1;
  const MAX_MINUTES = 120;
  const SAFETY_NOTE_HE =
    'הערת בטיחות: שמרו על גב ישר ויציב והידקו את רצועות התיק; הקשיבו לברכיים — בכל כאב חד בגב או בברכיים עצרו, הפחיתו עומס והתייעצו עם גורם רפואי.';

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function buildRuckingProgression(bodyWeightKg, currentMinutes, weekNumber) {
    if (bodyWeightKg == null || currentMinutes == null || weekNumber == null) {
      return null;
    }
    const bw = Number(bodyWeightKg);
    const cur = Number(currentMinutes);
    const wkRaw = Number(weekNumber);
    if (!Number.isFinite(bw) || !Number.isFinite(cur) || !Number.isFinite(wkRaw)) {
      return null;
    }
    if (bw <= 0 || cur <= 0 || wkRaw < 1) {
      return null;
    }
    const wk = Math.floor(wkRaw);
    const packWeightMinKg = round1(bw * MIN_PACK_RATIO);
    const packWeightMaxKg = round1(bw * MAX_PACK_RATIO);
    const ratio = Math.min(MIN_PACK_RATIO + (wk - 1) * 0.005, MAX_PACK_RATIO);
    let packWeightKg = round1(bw * ratio);
    if (packWeightKg < packWeightMinKg) packWeightKg = packWeightMinKg;
    if (packWeightKg > packWeightMaxKg) packWeightKg = packWeightMaxKg;
    const rawMinutes = cur * WEEKLY_TIME_FACTOR ** (wk - 1);
    let targetMinutes = Math.round(rawMinutes);
    let isCapped = false;
    if (targetMinutes > MAX_MINUTES) {
      targetMinutes = MAX_MINUTES;
      isCapped = true;
    }
    if (packWeightKg >= packWeightMaxKg && wk > 1) {
      isCapped = true;
    }
    const weeks = [];
    for (let i = 1; i <= wk; i++) {
      const r = Math.min(MIN_PACK_RATIO + (i - 1) * 0.005, MAX_PACK_RATIO);
      const p = round1(bw * r);
      let m = Math.round(cur * WEEKLY_TIME_FACTOR ** (i - 1));
      if (m > MAX_MINUTES) m = MAX_MINUTES;
      weeks.push({ week: i, packWeightKg: p, targetMinutes: m });
    }
    return {
      bodyWeightKg: bw,
      currentMinutes: cur,
      weekNumber: wk,
      week: wk,
      packWeightKg: packWeightKg,
      packWeightMinKg: packWeightMinKg,
      packWeightMaxKg: packWeightMaxKg,
      minPackWeightKg: packWeightMinKg,
      maxPackWeightKg: packWeightMaxKg,
      targetMinutes: targetMinutes,
      minutes: targetMinutes,
      isCapped: isCapped,
      safetyNote: SAFETY_NOTE_HE,
      safetyNoteHe: SAFETY_NOTE_HE,
      weeks: weeks,
      progression: weeks
    };
  }

  return {
    buildRuckingProgression: buildRuckingProgression,
    MIN_PACK_RATIO: MIN_PACK_RATIO,
    MAX_PACK_RATIO: MAX_PACK_RATIO,
    MAX_MINUTES: MAX_MINUTES,
    SAFETY_NOTE_HE: SAFETY_NOTE_HE
  };
});
