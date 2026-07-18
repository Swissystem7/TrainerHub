function predictChurnRisk(clientData) {
  if (!clientData || Object.keys(clientData).length === 0) {
    return { riskLevel: 'low', factors: ['Insufficient data'], score: 0 };
  }
  let score = 0;
  const factors = [];
  let attendanceRate = clientData.attendanceRate;
  if (attendanceRate !== undefined) {
    if (attendanceRate > 1) attendanceRate = 1;
    if (attendanceRate < 0) attendanceRate = 0;
    if (attendanceRate < 0.6) {
      score += 0.3;
      factors.push('Low attendance rate');
    }
  }
  const programCompletionRate = clientData.programCompletionRate;
  if (programCompletionRate !== undefined && programCompletionRate < 0.5) {
    score += 0.2;
    factors.push('Low program completion rate');
  }
  let lastContactDays = clientData.lastContactDays;
  if (lastContactDays !== undefined) {
    if (lastContactDays < 0) lastContactDays = 0;
    if (lastContactDays > 7) {
      score += 0.15;
      factors.push('Long time since last contact');
    }
  }
  const avgSessionDurationChange = clientData.avgSessionDurationChange;
  if (avgSessionDurationChange !== undefined && avgSessionDurationChange < -0.1) {
    score += 0.2;
    factors.push('Decreased session duration');
  }
  const missedSessionsStreak = clientData.missedSessionsStreak;
  if (missedSessionsStreak !== undefined && missedSessionsStreak > 3) {
    score += 0.2;
    factors.push('Missed sessions streak');
  }
  const communicationResponsiveness = clientData.communicationResponsiveness;
  if (communicationResponsiveness !== undefined && communicationResponsiveness < 0.4) {
    score += 0.15;
    factors.push('Low communication responsiveness');
  }
  const initialGoalProgress = clientData.initialGoalProgress;
  if (initialGoalProgress !== undefined && initialGoalProgress < 0.3) {
    score += 0.1;
    factors.push('Low initial goal progress');
  }
  let riskLevel;
  if (score < 0.3) {
    riskLevel = 'low';
  } else if (score <= 0.6) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }
  return { riskLevel, factors, score };
}
module.exports = { predictChurnRisk };