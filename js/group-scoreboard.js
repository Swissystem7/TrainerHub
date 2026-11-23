((root) => {
  const STORAGE_KEY = 'trainerhub_group_board';

  function sanitizeSlotOrStation(val) {
    if (val == null) return '';
    let str = String(val).trim();
    // Strip emails
    str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    // Strip phone numbers (Israeli formats or 7+ digits)
    str = str.replace(/(?:\+?972[- ]?|0)(?:[23489]|5[0-9]|77)[- ]?\d{7}\b/g, '');
    str = str.replace(/\b\d{7,15}\b/g, '');
    return str.trim();
  }

  function getSafeStorage(customStorage) {
    if (customStorage && typeof customStorage.getItem === 'function' && typeof customStorage.setItem === 'function') {
      return customStorage;
    }
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
      return localStorage;
    }
    return null;
  }

  function recordStationScore(stationName, slotLabel, scoreValue, metricType, storage) {
    try {
      const store = getSafeStorage(storage);
      if (!store) return null;

      const cleanStation = sanitizeSlotOrStation(stationName);
      const cleanSlot = sanitizeSlotOrStation(slotLabel);
      if (!cleanStation || !cleanSlot) return null;

      const numScore = Number(scoreValue);
      if (scoreValue == null || Number.isNaN(numScore) || numScore < 0) {
        return null;
      }

      const normalizedMetric =
        metricType === 'time' || metricType === 'seconds' || metricType === 'clock' ? 'time' : 'reps';

      let current = [];
      const raw = store.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) current = parsed;
        } catch (_) {
          current = [];
        }
      }

      const entry = {
        stationName: cleanStation,
        slotLabel: cleanSlot,
        scoreValue: numScore,
        metricType: normalizedMetric,
        timestamp: Date.now()
      };

      current.push(entry);
      store.setItem(STORAGE_KEY, JSON.stringify(current));
      return entry;
    } catch (_) {
      return null;
    }
  }

  function rankStationParticipants(entries, metricType) {
    if (!Array.isArray(entries)) return [];

    const normalizedMetric =
      metricType === 'time' || metricType === 'seconds' || metricType === 'clock' ? 'time' : 'reps';

    const validEntries = entries
      .filter((e) => e && (typeof e.scoreValue === 'number' || typeof e.score === 'number'))
      .map((e) => {
        const val = Number(e.scoreValue ?? e.score);
        return {
          stationName: e.stationName || e.station || '',
          slotLabel: e.slotLabel || e.slot || '',
          scoreValue: val,
          metricType: e.metricType || normalizedMetric,
          timestamp: e.timestamp || Date.now()
        };
      })
      .filter((e) => !Number.isNaN(e.scoreValue));

    validEntries.sort((a, b) => {
      if (normalizedMetric === 'time') {
        return a.scoreValue - b.scoreValue;
      }
      return b.scoreValue - a.scoreValue;
    });

    return validEntries.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }

  function getStationScores(stationName, storage) {
    try {
      const store = getSafeStorage(storage);
      if (!store) return [];
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      if (!stationName) return list;
      return list.filter((e) => e && e.stationName === stationName);
    } catch (_) {
      return [];
    }
  }

  function clearStationScores(storage) {
    try {
      const store = getSafeStorage(storage);
      if (store && typeof store.removeItem === 'function') {
        store.removeItem(STORAGE_KEY);
        return true;
      }
      if (store && typeof store.setItem === 'function') {
        store.setItem(STORAGE_KEY, JSON.stringify([]));
        return true;
      }
    } catch (_) {}
    return false;
  }

  const api = {
    STORAGE_KEY,
    recordStationScore,
    rankStationParticipants,
    getStationScores,
    clearStationScores
  };

  if (root) {
    root.THGroupScoreboard = api;
    root.recordStationScore = recordStationScore;
    root.rankStationParticipants = rankStationParticipants;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
