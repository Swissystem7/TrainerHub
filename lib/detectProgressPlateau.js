function detectProgressPlateau(exerciseData, exerciseName, options = {}) {
  if (!exerciseName || exerciseName.trim() === '') {
    return { error: 'exerciseName required' };
  }
  if (!Array.isArray(exerciseData) || exerciseData.length === 0) {
    return { error: 'exerciseData cannot be empty' };
  }
  for (const entry of exerciseData) {
    if (!entry || !Number.isFinite(entry.metric)) {
      return { error: 'Invalid metric value in exerciseData' };
    }
  }
  const plateauWindowDays = Number.isFinite(options.plateauWindowDays) && options.plateauWindowDays > 0 ? options.plateauWindowDays : 28;
  const minDataPoints = Number.isInteger(options.minDataPoints) && options.minDataPoints > 0 ? options.minDataPoints : 3;
  if (exerciseData.length < minDataPoints) {
    return { isPlateau: null, recommendation: `Insufficient data to detect plateau for ${exerciseName}.` };
  }
  const now = new Date();
  const cutoff = new Date(now.getTime() - plateauWindowDays * 24 * 60 * 60 * 1000);
  const recentData = exerciseData
    .filter(d => typeof d.date === 'string' && Number.isFinite(Date.parse(d.date)) && new Date(d.date) >= cutoff)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (recentData.length < 2) {
    return { isPlateau: null, recommendation: `Insufficient data to detect plateau for ${exerciseName}.` };
  }
  const bestMetric = Math.max(...recentData.slice(0, -1).map(d => d.metric));
  const latestMetric = recentData[recentData.length - 1].metric;
  const firstRecentMetric = recentData[0].metric;
  const increase = firstRecentMetric === 0 ? (latestMetric > 0 ? Infinity : 0) : (latestMetric - firstRecentMetric) / Math.abs(firstRecentMetric);
  const tolerance = 0.005;
  const isPlateau = increase <= tolerance || latestMetric < bestMetric;
  if (isPlateau) {
    return { isPlateau: true, recommendation: `Client has plateaued on ${exerciseName}. Consider deload week, new variation, or adjusting frequency.` };
  } else {
    return { isPlateau: false, recommendation: `No plateau detected on ${exerciseName}. Continue current program.` };
  }
}
module.exports = { detectProgressPlateau };
