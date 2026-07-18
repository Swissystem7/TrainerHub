function generateWeeklyPlan(scoredExercises, params, weekNumber) {
  if (!scoredExercises || scoredExercises.length === 0) return [];
  const goal = (params.goal || 'hypertrophy').toLowerCase();
  const goalTable = {
    strength: { sets: [3, 5], reps: [1, 6], rest: 180 },
    hypertrophy: { sets: [3, 4], reps: [8, 12], rest: 90 },
    endurance: { sets: [2, 3], reps: [15, 20], rest: 30 }
  };
  const config = goalTable[goal] || goalTable.hypertrophy;
  const maxWeek = 12;
  const clampedWeek = Math.max(1, Math.min(weekNumber, maxWeek));
  const volumeMultiplier = 1.0 + (clampedWeek - 1) * (0.5 / (maxWeek - 1));
  const sorted = [...scoredExercises].sort((a, b) => b.finalScore - a.finalScore);
  const selected = [];
  const usedMuscles = new Set();
  for (const ex of sorted) {
    if (selected.length >= 6) break;
    const muscle = (ex.exercise.muscles || [ex.exercise.name])[0];
    if (!usedMuscles.has(muscle) || selected.length < 3) {
      selected.push(ex);
      usedMuscles.add(muscle);
    }
  }
  return selected.map(ex => {
    const baseSets = Math.round((config.sets[0] + config.sets[1]) / 2);
    const adjustedSets = Math.max(config.sets[0], Math.min(config.sets[1], Math.round(baseSets * volumeMultiplier)));
    return {
      exerciseName: ex.exercise.name,
      sets: adjustedSets,
      repsRange: [config.reps[0], config.reps[1]],
      restSeconds: config.rest
    };
  });
}
module.exports = { generateWeeklyPlan };
