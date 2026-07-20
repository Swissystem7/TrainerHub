function detectClientChurnSignal(clientId, activityLog, assignmentLog, config = {}) {
  if (!clientId || typeof clientId !== 'string') {
    throw new Error('Invalid clientId');
  }
  const inactivityDays = Number.isFinite(config.inactivityDays) && config.inactivityDays >= 0 ? config.inactivityDays : 7;
  const missedWorkoutThreshold = Number.isInteger(config.missedWorkoutThreshold) && config.missedWorkoutThreshold >= 0 ? config.missedWorkoutThreshold : 2;
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const validActivity = (Array.isArray(activityLog) ? activityLog : []).filter(e => e && Number.isFinite(e.timestamp) && e.timestamp <= now && e.timestamp >= ninetyDaysAgo && ['workout','checkin','login'].includes(e.type));
  const validAssignments = (Array.isArray(assignmentLog) ? assignmentLog : []).filter(a => a && a.workoutId && Number.isFinite(a.deadline) && typeof a.completed === 'boolean' && a.deadline >= ninetyDaysAgo && a.deadline <= now);
  if (validActivity.length === 0 && validAssignments.length === 0) {
    return { riskScore: 0, signals: [], suggestedAction: '' };
  }
  const signals = [];
  const lastActivity = validActivity.reduce((max, e) => e.timestamp > max ? e.timestamp : max, 0);
  const daysSinceLastActivity = lastActivity ? Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000)) : Infinity;
  if (daysSinceLastActivity > inactivityDays) {
    signals.push(lastActivity ? `no login in ${daysSinceLastActivity} days` : 'no recent activity');
  }
  const sortedAssignments = validAssignments.sort((a, b) => a.deadline - b.deadline);
  let missedStreak = 0;
  let maxMissedStreak = 0;
  for (const a of sortedAssignments) {
    if (!a.completed) {
      missedStreak++;
      if (missedStreak > maxMissedStreak) maxMissedStreak = missedStreak;
    } else {
      missedStreak = 0;
    }
  }
  if (maxMissedStreak >= missedWorkoutThreshold) {
    signals.push(`missed ${maxMissedStreak} workouts in a row`);
  }
  let riskScore = 0;
  if (signals.length > 0) {
    const inactivityFactor = daysSinceLastActivity > inactivityDays ? Math.min(1, (daysSinceLastActivity - inactivityDays) / 30) : 0;
    const missedFactor = maxMissedStreak >= missedWorkoutThreshold ? Math.min(1, (maxMissedStreak - missedWorkoutThreshold + 1) / 5) : 0;
    riskScore = Math.min(1, (inactivityFactor * 0.6 + missedFactor * 0.4));
  }
  let suggestedAction = '';
  if (riskScore > 0.7) {
    suggestedAction = 'call client';
  } else if (riskScore > 0.3) {
    suggestedAction = 'send reminder email';
  } else if (riskScore > 0) {
    suggestedAction = 'offer free session';
  }
  return { riskScore: Math.round(riskScore * 100) / 100, signals, suggestedAction };
}
module.exports = { detectClientChurnSignal };
