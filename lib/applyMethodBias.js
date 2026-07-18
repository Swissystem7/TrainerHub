function applyMethodBias(exercises, methodDescriptors) {
  const method = methodDescriptors[0];
  if (!method) return exercises.map(e => ({ exercise: e.exercise, finalScore: e.score })).sort((a, b) => b.finalScore - a.finalScore);
  const intensityMap = { 'low': 0.1, 'med': 0.2, 'high': 0.3 };
  const methodIntensity = intensityMap[method.intensity];
  const result = exercises.map(ex => {
    let weight = 1.0;
    const exMuscles = ex.exercise.muscles || [];
    const overlap = exMuscles.some(m => method.favoredMuscles.includes(m));
    if (overlap) weight += 0.2;
    const exIntensity = ex.exercise.intensity || 0;
    if (Math.abs(exIntensity - methodIntensity) < 0.05) weight += 0.1;
    return { exercise: ex.exercise, finalScore: ex.score * weight };
  });
  return result.sort((a, b) => b.finalScore - a.finalScore);
}
module.exports = { applyMethodBias };