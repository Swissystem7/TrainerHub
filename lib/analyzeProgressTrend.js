function analyzeProgressTrend(metricType, dataPoints, plateauThreshold) {
  const validMetrics = new Set(['strength', 'endurance', 'body_fat', 'weight', 'waist']);
  if (!validMetrics.has(metricType) || !Array.isArray(dataPoints)) throw new Error('Invalid input');
  const valid = dataPoints.filter(d => d && Number.isFinite(d.value) && typeof d.date === 'string' && !Number.isNaN(Date.parse(d.date)));
  if (valid.length < 2) {
    return { trend: 'insufficient_data', percentChange: 0, lastValues: [], plateauDetected: false, plateauDescription: 'Not enough data points' };
  }
  const sorted = [...valid].sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = sorted.map(d => d.value);
  const lastValues = values.slice(-5);
  const first = values[0];
  const last = values[values.length - 1];
  const percentChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  let plateauDetected = false;
  let plateauDescription = '';
  if (Number.isFinite(plateauThreshold) && plateauThreshold > 0 && values.length >= 4) {
    const recent = values.slice(-4);
    const maxRecent = Math.max(...recent);
    const minRecent = Math.min(...recent);
    const range = maxRecent - minRecent;
    if (range <= plateauThreshold) {
      plateauDetected = true;
      plateauDescription = `Values in last 4 points vary by ${range.toFixed(2)} (threshold ${plateauThreshold})`;
    }
  }
  let trend;
  if (plateauDetected) {
    trend = 'plateau';
  } else if (Math.abs(percentChange) <= 1) {
    trend = 'stable';
  } else {
    const lowerIsBetter = metricType === 'body_fat' || metricType === 'weight' || metricType === 'waist';
    trend = (percentChange > 0) !== lowerIsBetter ? 'improving' : 'declining';
  }
  return { trend, percentChange: Math.round(percentChange * 100) / 100, lastValues, plateauDetected, plateauDescription };
}
module.exports = { analyzeProgressTrend };
