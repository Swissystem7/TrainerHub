((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MovementPatterns = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => {
  function classifyMovementPattern(exercise) {
    if (!exercise || typeof exercise !== 'object') return 'core';
    var text = [exercise.name_he || '', exercise.name || '', exercise.muscle_group || '', exercise.description || '']
      .join(' ')
      .toLowerCase();

    if (/חזה|כתף|דחיפה|push|bench|press|dip/.test(text)) return 'push';
    if (/גב|משיכה|pull|row|pullup|chinup/.test(text)) return 'pull';
    if (/סקוואט|רגליים|squat|lunge/.test(text)) return 'squat';
    if (/היפ|דדליפט|hinge|deadlift|bridge/.test(text)) return 'hinge';
    return 'core';
  }

  function checkFullBodyPatternCoverage(workout) {
    if (!workout || !Array.isArray(workout.exercises)) {
      return { ok: false, missing: ['push', 'pull', 'squat', 'hinge', 'core'] };
    }
    var found = { push: false, pull: false, squat: false, hinge: false, core: false };
    workout.exercises.forEach((ex) => {
      var p = classifyMovementPattern(ex);
      if (found[p] !== undefined) found[p] = true;
    });
    var missing = Object.keys(found).filter((k) => !found[k]);
    return { ok: missing.length === 0, missing: missing };
  }

  return {
    classifyMovementPattern: classifyMovementPattern,
    checkFullBodyPatternCoverage: checkFullBodyPatternCoverage
  };
});
