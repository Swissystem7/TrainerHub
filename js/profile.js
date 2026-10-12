/**
 * TrainerHub — פרופיל מתאמן (ציוד ומגבלות) לפי מזהה לקוח.
 * Classic script / CommonJS. Namespace: window.THClientProfile
 */
(function (root) {
  'use strict';

  var TH = root.TH;
  if (typeof module === 'object' && module.exports) {
    TH = require('./core.js');
  }

  function normalizeProfile(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      equipment: Array.isArray(raw.equipment) ? raw.equipment.slice() : [],
      limitations: Array.isArray(raw.limitations) ? raw.limitations.slice() : []
    };
  }

  function allProfiles() {
    var map = TH.store.get(TH.KEYS.clientProfiles, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }

  function saveProfile(clientId, profile) {
    var id = String(clientId || '').trim();
    if (!id) return false;
    var map = allProfiles();
    map[id] = normalizeProfile(profile);
    return TH.store.set(TH.KEYS.clientProfiles, map);
  }

  function getProfile(clientId) {
    var id = String(clientId || '').trim();
    if (!id) return normalizeProfile(null);
    var map = allProfiles();
    return normalizeProfile(map[id]);
  }

  var api = {
    normalizeProfile: normalizeProfile,
    saveProfile: saveProfile,
    getProfile: getProfile
  };

  root.THClientProfile = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
