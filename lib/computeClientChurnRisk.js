function computeClientChurnRisk(clientId, workoutHistory, options = {}) {
  if (typeof clientId !== 'string' || clientId.trim() === '') {
    return { error: 'Invalid clientId' };
  }
  if (!Array.isArray(workoutHistory)) {
    return { error: 'Invalid workoutHistory' };
  }
  if (workoutHistory.length === 0) {
    return { riskScore: 1.0, riskCategory: 'high' };
  }
  const inactivityWindowDays = Number.isFinite(options.inactivityWindowDays) && options.inactivityWindowDays > 0 ? options.inactivityWindowDays : 14;
  const minWorkoutsPerWeek = Number.isFinite(options.minWorkoutsPerWeek) && options.minWorkoutsPerWeek > 0 ? options.minWorkoutsPerWeek : 2;
  const validHistory = workoutHistory.filter(w => w && typeof w.completed === 'boolean' && typeof w.date === 'string' && Number.isFinite(Date.parse(w.date)));
  if (validHistory.length === 0) return { riskScore: 1.0, riskCategory: 'high' };
  const now = new Date();
  const sorted = [...validHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestDate = new Date(sorted[0].date);
  const daysSinceLastWorkout = (now - latestDate) / (1000 * 60 * 60 * 24);
  const inactivityScore = Math.min(daysSinceLastWorkout / inactivityWindowDays, 1);
  const totalWorkouts = validHistory.length;
  const completedWorkouts = validHistory.filter(w => w.completed).length;
  const completionRate = totalWorkouts > 0 ? completedWorkouts / totalWorkouts : 0;
  const earliestDate = new Date(sorted[sorted.length - 1].date);
  const totalDays = (now - earliestDate) / (1000 * 60 * 60 * 24);
  const weeks = Math.max(totalDays / 7, 1);
  const avgWorkoutsPerWeek = totalWorkouts / weeks;
  const frequencyScore = avgWorkoutsPerWeek < minWorkoutsPerWeek ? Math.min((minWorkoutsPerWeek - avgWorkoutsPerWeek) / minWorkoutsPerWeek, 1) : 0;
  const completionScore = 1 - completionRate;
  const riskScore = Math.min(Math.max(inactivityScore * 0.5 + frequencyScore * 0.3 + completionScore * 0.2, 0), 1);
  let riskCategory;
  if (riskScore < 0.3) {
    riskCategory = 'low';
  } else if (riskScore <= 0.6) {
    riskCategory = 'medium';
  } else {
    riskCategory = 'high';
  }
  return { riskScore, riskCategory };
}
module.exports = { computeClientChurnRisk };
