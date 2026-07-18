function applyAgeConstraints(plan, ageGroup) {
  if (ageGroup === 'child') {
    return plan
      .filter(ex => !ex.exerciseName.toLowerCase().includes('overhead') && !ex.exerciseName.toLowerCase().includes('plyometric'))
      .map(ex => ({
        exerciseName: ex.exerciseName,
        sets: Math.min(ex.sets, 2),
        repsRange: ex.repsRange.map(reps => Math.min(reps, 12)),
        restSeconds: Math.max(ex.restSeconds, 60)
      }));
  } else if (ageGroup === 'senior') {
    return plan.map(ex => ({
      exerciseName: ex.exerciseName,
      sets: Math.min(ex.sets, 3),
      repsRange: ex.repsRange.map(reps => Math.min(reps, 15)),
      restSeconds: Math.max(ex.restSeconds, 90)
    }));
  } else {
    return plan.map(ex => ({ ...ex }));
  }
}

module.exports = { applyAgeConstraints };
