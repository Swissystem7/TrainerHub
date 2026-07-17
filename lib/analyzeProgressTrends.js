function analyzeProgressTrends(clientMetricsHistory, programPhase) {
  const validPhases = ['hypertrophy','strength','endurance','fat_loss','maintenance'];
  if (!validPhases.includes(programPhase)) programPhase = 'maintenance';

  const sorted = [...clientMetricsHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
  if (sorted.length < 2) {
    return { trend: 'insufficient_data', significantChanges: [], recommendations: ['Need more measurements to analyze trends'] };
  }

  const safeVal = (v) => (v === null || v === undefined || isNaN(v) || !isFinite(v)) ? null : v;

  const extractMetric = (entry, metric) => {
    if (metric === 'weight') return safeVal(entry.metrics.weight);
    if (metric === 'bodyFat') return safeVal(entry.metrics.bodyFat);
    if (metric === 'cardioEndurance') return safeVal(entry.metrics.cardioEndurance);
    return null;
  };

  const getStrengthExercises = () => {
    const exercises = new Set();
    for (const entry of sorted) {
      if (entry.metrics.strengthScores) {
        Object.keys(entry.metrics.strengthScores).forEach(ex => exercises.add(ex));
      }
    }
    return Array.from(exercises);
  };

  const linearSlope = (values) => {
    const n = values.length;
    if (n < 2) return 0;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a,b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) * (i - xMean);
    }
    return den === 0 ? 0 : num / den;
  };

  const getRecentValues = (metric, maxPoints = 5) => {
    const vals = [];
    for (let i = sorted.length - 1; i >= 0 && vals.length < maxPoints; i--) {
      const v = extractMetric(sorted[i], metric);
      if (v !== null) vals.unshift(v);
    }
    return vals;
  };

  const computeTrendForMetric = (metric) => {
    const vals = getRecentValues(metric);
    if (vals.length < 2) return { direction: 'stable', slope: 0 };
    const slope = linearSlope(vals);
    const mean = vals.reduce((a,b) => a + b, 0) / vals.length;
    const normalizedSlope = mean === 0 ? 0 : slope / mean;
    if (normalizedSlope > 0.05) return { direction: 'increase', slope: normalizedSlope };
    if (normalizedSlope < -0.05) return { direction: 'decrease', slope: normalizedSlope };
    return { direction: 'stable', slope: normalizedSlope };
  };

  const significantChanges = [];
  const metricsToCheck = ['weight', 'bodyFat', 'cardioEndurance'];

  for (const metric of metricsToCheck) {
    const vals = getRecentValues(metric);
    if (vals.length < 2) continue;
    const first = vals[0];
    const last = vals[vals.length - 1];
    if (first === 0) continue;
    const pctChange = ((last - first) / Math.abs(first)) * 100;
    const trend = computeTrendForMetric(metric);
    if (trend.direction === 'stable') continue;

    let significance = 'low';
    if (metric === 'bodyFat' || metric === 'weight') {
      if (programPhase === 'fat_loss') {
        const weeks = (sorted.length - 1) * 7 / (sorted.length > 1 ? (sorted.length - 1) : 1);
        const weeklyPct = pctChange / (weeks > 0 ? weeks : 1);
        if (Math.abs(weeklyPct) > 1) significance = 'high';
        else if (Math.abs(weeklyPct) > 0.5) significance = 'medium';
      } else {
        if (Math.abs(pctChange) > 5) significance = 'high';
        else if (Math.abs(pctChange) > 2) significance = 'medium';
      }
    } else if (metric === 'cardioEndurance') {
      if (Math.abs(pctChange) > 10) significance = 'high';
      else if (Math.abs(pctChange) > 5) significance = 'medium';
    }

    significantChanges.push({
      metric,
      direction: trend.direction === 'increase' ? 'increase' : 'decrease',
      percentageChange: Math.round(pctChange * 100) / 100,
      significance
    });
  }

  const strengthExercises = getStrengthExercises();
  for (const exercise of strengthExercises) {
    const vals = [];
    for (const entry of sorted) {
      if (entry.metrics.strengthScores && entry.metrics.strengthScores[exercise] !== null && entry.metrics.strengthScores[exercise] !== undefined) {
        vals.push(safeVal(entry.metrics.strengthScores[exercise]));
      }
    }
    if (vals.length < 2) continue;
    const first = vals[0];
    const last = vals[vals.length - 1];
    if (first === 0) continue;
    const pctChange = ((last - first) / Math.abs(first)) * 100;
    const months = (sorted.length - 1) * 7 / 30;
    const monthlyPct = months > 0 ? pctChange / months : pctChange;
    if (monthlyPct > 5) {
      significantChanges.push({
        metric: `strength_${exercise}`,
        direction: 'increase',
        percentageChange: Math.round(pctChange * 100) / 100,
        significance: 'high'
      });
    } else if (monthlyPct < -5) {
      significantChanges.push({
        metric: `strength_${exercise}`,
        direction: 'decrease',
        percentageChange: Math.round(pctChange * 100) / 100,
        significance: 'high'
      });
    }
  }

  const allTrends = metricsToCheck.map(m => computeTrendForMetric(m));
  const strengthTrends = strengthExercises.map(ex => {
    const vals = [];
    for (const entry of sorted) {
      if (entry.metrics.strengthScores && entry.metrics.strengthScores[ex] !== null && entry.metrics.strengthScores[ex] !== undefined) {
        vals.push(safeVal(entry.metrics.strengthScores[ex]));
      }
    }
    if (vals.length < 2) return 'stable';
    const slope = linearSlope(vals);
    const mean = vals.reduce((a,b) => a + b, 0) / vals.length;
    const ns = mean === 0 ? 0 : slope / mean;
    if (ns > 0.05) return 'increase';
    if (ns < -0.05) return 'decrease';
    return 'stable';
  });

  const hasIncrease = allTrends.some(t => t.direction === 'increase') || strengthTrends.some(t => t === 'increase');
  const hasDecrease = allTrends.some(t => t.direction === 'decrease') || strengthTrends.some(t => t === 'decrease');

  let trend;
  if (hasIncrease && !hasDecrease) trend = 'improving';
  else if (hasDecrease && !hasIncrease) trend = 'declining';
  else if (hasIncrease && hasDecrease) trend = 'stagnant';
  else trend = 'stagnant';

  const recommendations = [];

  if (trend === 'declining' || trend === 'stagnant') {
    if (programPhase === 'hypertrophy') {
      recommendations.push('Consider a deload week or adjust nutrition to support muscle growth');
    } else if (programPhase === 'strength') {
      recommendations.push('Review recovery protocols and consider periodization adjustments');
    } else if (programPhase === 'endurance') {
      recommendations.push('Incorporate more recovery sessions and check for overtraining');
    } else if (programPhase === 'fat_loss') {
      recommendations.push('Ensure caloric deficit is not too aggressive to preserve muscle mass');
    } else {
      recommendations.push('Reassess training intensity and nutrition to maintain progress');
    }
  }

  if (programPhase === 'fat_loss') {
    const weightTrend = computeTrendForMetric('weight');
    if (weightTrend.direction === 'decrease' && Math.abs(weightTrend.slope) > 0.01) {
      const vals = getRecentValues('weight');
      if (vals.length >= 2) {
        const weeks = (sorted.length - 1) * 7 / (sorted.length > 1 ? (sorted.length - 1) : 1);
        const pct = ((vals[vals.length-1] - vals[0]) / Math.abs(vals[0])) * 100;
        const weeklyPct = weeks > 0 ? Math.abs(pct) / weeks : 0;
        if (weeklyPct > 1) {
        }
      }
    }
  }

  if (trend === 'improving' && recommendations.length === 0) {
    recommendations.push('Continue current program, progress is positive');
  }

  if (recommendations.length === 0) {
    recommendations.push('Monitor consistently to detect trends early');
  }

  return { trend, significantChanges, recommendations };
}

module.exports = { analyzeProgressTrends };
