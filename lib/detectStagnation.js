function detectStagnation(weeklyMetrics, config) {
  const windowWeeks = (config && Number.isInteger(config.windowWeeks) && config.windowWeeks > 0) ? config.windowWeeks : 4;
  const stagnationThreshold = (config && Number.isInteger(config.stagnationThreshold) && config.stagnationThreshold > 0) ? config.stagnationThreshold : 2;
  const improvementDirection = (config && config.improvementDirection === 'decrease') ? 'decrease' : 'increase';

  if (!Array.isArray(weeklyMetrics) || weeklyMetrics.length < 2) {
    return { isStagnated: false, weeksStagnated: 0, suggestion: 'Insufficient data' };
  }

  const validMetrics = weeklyMetrics.filter(m => m && Number.isFinite(m.value) && m.value >= 0 && Number.isFinite(Date.parse(m.weekStart))).sort((a,b) => Date.parse(a.weekStart)-Date.parse(b.weekStart));
  if (validMetrics.length < 2) {
    return { isStagnated: false, weeksStagnated: 0, suggestion: 'Insufficient data' };
  }

  const effectiveWindow = Math.min(windowWeeks, validMetrics.length);
  const startIdx = validMetrics.length - effectiveWindow;
  const windowData = validMetrics.slice(startIdx);

  let consecutiveStagnant = 0;

  for (let i = 1; i < windowData.length; i++) {
    const change = windowData[i].value - windowData[i - 1].value;
    let isStagnant = false;
    if (improvementDirection === 'increase') {
      isStagnant = change <= 0;
    } else {
      isStagnant = change >= 0;
    }
    if (isStagnant) {
      consecutiveStagnant++;
    } else {
      consecutiveStagnant = 0;
    }
  }

  const isStagnated = consecutiveStagnant >= stagnationThreshold;
  const weeksStagnated = Math.min(consecutiveStagnant, windowWeeks);
  const suggestion = improvementDirection === 'increase' ? 'Consider increasing intensity or changing exercise' : 'Reassess recovery or reduce volume';

  return { isStagnated, weeksStagnated, suggestion };
}

module.exports = { detectStagnation };
