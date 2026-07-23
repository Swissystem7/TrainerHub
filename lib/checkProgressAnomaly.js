function checkProgressAnomaly({ clientId, progressData }) {
  const anomalies = [];
  if (!Array.isArray(progressData) || progressData.length === 0) return { anomalies };

  const positiveMetrics = new Set(['weight', 'body_fat', 'muscle_mass', 'bmi', 'waist_circumference', 'hip_circumference']);
  const metricValues = new Map();

  for (let i = 0; i < progressData.length; i++) {
    const entry = progressData[i] && typeof progressData[i] === 'object' ? progressData[i] : {};
    const { date, metric, value } = entry;

    if (!date || !metric || value === undefined || value === null) {
      anomalies.push({
        type: 'missing_field',
        description: `Entry at index ${i} is missing date, metric, or value`,
        severity: 'high',
        timestamp: date || new Date().toISOString()
      });
      continue;
    }

    if (typeof value !== 'number' || isNaN(value)) {
      anomalies.push({
        type: 'invalid_value',
        description: `Non-numeric value for metric '${metric}' on ${date}`,
        severity: 'high',
        timestamp: date
      });
      continue;
    }

    if (!metricValues.has(metric)) metricValues.set(metric, []);
    const metricArr = metricValues.get(metric);

    const duplicate = metricArr.find(e => e.date === date);
    if (duplicate) {
      anomalies.push({
        type: 'duplicate_entry',
        description: `Duplicate date '${date}' for metric '${metric}'`,
        severity: 'medium',
        timestamp: date
      });
      continue;
    }

    if (positiveMetrics.has(metric) && value < 0) {
      anomalies.push({
        type: 'negative_value',
        description: `Negative value ${value} for metric '${metric}' on ${date}`,
        severity: 'high',
        timestamp: date
      });
    }

    const window = metricArr.slice(-5);
    if (window.length >= 2) {
      const mean = window.reduce((s, e) => s + e.value, 0) / window.length;
      const variance = window.reduce((s, e) => s + (e.value - mean) ** 2, 0) / window.length;
      const std = Math.sqrt(variance);
      if ((std === 0 && value !== mean) || (std > 0 && Math.abs(value - mean) > 3 * std)) {
        anomalies.push({
          type: 'statistical_outlier',
          description: `Value ${value} for metric '${metric}' on ${date} is a statistical outlier (mean=${mean.toFixed(2)}, std=${std.toFixed(2)})`,
          severity: 'medium',
          timestamp: date
        });
      }
    }

    if (metricArr.length >= 1) {
      const lastEntry = metricArr[metricArr.length - 1];
      const prevDate = new Date(lastEntry.date);
      const currDate = new Date(date);
      const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7 && diffDays > 0) {
        const change = lastEntry.value === 0 ? (value === 0 ? 0 : Infinity) : Math.abs((value - lastEntry.value) / lastEntry.value);
        if (change > 0.2) {
          anomalies.push({
            type: 'unrealistic_change',
            description: `Unrealistic change of ${(change * 100).toFixed(1)}% in metric '${metric}' from ${lastEntry.date} to ${date}`,
            severity: 'high',
            timestamp: date
          });
        }
      }
    }
    metricArr.push({ date, value });
  }

  return { anomalies };
}

module.exports = { checkProgressAnomaly };
