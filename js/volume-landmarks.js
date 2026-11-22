/**
 * Volume Landmarks Module (Client-side / CommonJS / UMD)
 * Namespace: window.THVolumeLandmarks
 */
((root) => {
  function classifyWeeklyVolume(setsCount) {
    var n = Number(setsCount) || 0;
    if (n < 6) return 'low';
    if (n <= 16) return 'effective';
    return 'high_warning';
  }

  // Simple direct + indirect mapping for muscles
  var _INDIRECT_MAP = {
    chest: ['triceps', 'shoulders'],
    back: ['biceps'],
    legs: ['core']
  };

  function buildMuscleVolumeOverview(sessions) {
    var overview = {};
    var list = Array.isArray(sessions) ? sessions : [];
    list.forEach((s) => {
      var phases = s?.phases || [];
      phases.forEach((p) => {
        var exercises = p?.exercises || [];
        exercises.forEach((ex) => {
          var sets = Number(ex?.sets) || 1;
          // Infer muscle group from exercise name or id if available
          var muscles = ex?.muscles || [ex?.focus];
          muscles.forEach((m, idx) => {
            if (!m || m === 'general') return;
            if (!overview[m]) {
              overview[m] = { direct: 0, indirect: 0, total: 0 };
            }
            if (idx === 0) {
              overview[m].direct += sets;
            } else {
              overview[m].indirect += sets * 0.5;
            }
          });
        });
      });
    });

    Object.keys(overview).forEach((m) => {
      var item = overview[m];
      item.total = item.direct + item.indirect;
      item.classification = classifyWeeklyVolume(item.total);
    });

    return overview;
  }

  var api = {
    classifyWeeklyVolume: classifyWeeklyVolume,
    buildMuscleVolumeOverview: buildMuscleVolumeOverview
  };
  root.THVolumeLandmarks = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
