function calculateChurnRiskScore(clientId, engagementData) {
  if (!engagementData || typeof engagementData !== 'object') {
    return { error: 'Missing required fields' };
  }
  const requiredFields = [
    'daysSinceLastSession',
    'completionRate',
    'avgSessionDurationMinutes',
    'communicationGapDays',
    'daysSinceLastPayment',
    'missedSessionsLastMonth'
  ];
  for (const field of requiredFields) {
    if (!(field in engagementData)) {
      return { error: 'Missing required fields' };
    }
  }
  let {
    daysSinceLastSession,
    completionRate,
    avgSessionDurationMinutes,
    communicationGapDays,
    daysSinceLastPayment,
    missedSessionsLastMonth
  } = engagementData;
  if (daysSinceLastSession === null || daysSinceLastSession === undefined) {
    daysSinceLastSession = 999;
  }
  if (!Number.isFinite(daysSinceLastSession) || daysSinceLastSession < 0) daysSinceLastSession = 0;
  if (!Number.isFinite(completionRate) || completionRate < 0) completionRate = 0;
  if (completionRate > 1) completionRate = 1;
  if (!Number.isFinite(avgSessionDurationMinutes) || avgSessionDurationMinutes < 0) avgSessionDurationMinutes = 0;
  if (!Number.isFinite(communicationGapDays) || communicationGapDays < 0) communicationGapDays = 0;
  if (!Number.isFinite(daysSinceLastPayment) || daysSinceLastPayment < 0) daysSinceLastPayment = 0;
  if (!Number.isFinite(missedSessionsLastMonth) || missedSessionsLastMonth < 0) missedSessionsLastMonth = 0;
  const maxDaysSinceSession = 365;
  const maxSessionDuration = 120;
  const maxCommGap = 90;
  const maxPaymentGap = 90;
  const maxMissed = 30;
  const sessionRecencyScore = Math.min(daysSinceLastSession / maxDaysSinceSession, 1);
  const completionScore = 1 - completionRate;
  const durationScore = avgSessionDurationMinutes > 0 ? Math.max(0, 1 - (avgSessionDurationMinutes / maxSessionDuration)) : 1;
  const commGapScore = Math.min(communicationGapDays / maxCommGap, 1);
  const paymentGapScore = Math.min(daysSinceLastPayment / maxPaymentGap, 1);
  const missedScore = Math.min(missedSessionsLastMonth / maxMissed, 1);
  const weights = {
    sessionRecency: 0.25,
    completion: 0.20,
    duration: 0.15,
    commGap: 0.15,
    paymentGap: 0.15,
    missed: 0.10
  };
  const riskScore = Math.min(
    sessionRecencyScore * weights.sessionRecency +
    completionScore * weights.completion +
    durationScore * weights.duration +
    commGapScore * weights.commGap +
    paymentGapScore * weights.paymentGap +
    missedScore * weights.missed,
    1
  );
  const factors = [
    { name: 'Session recency', score: sessionRecencyScore },
    { name: 'Low completion rate', score: completionScore },
    { name: 'Short session duration', score: durationScore },
    { name: 'Communication gap', score: commGapScore },
    { name: 'Payment gap', score: paymentGapScore },
    { name: 'Missed sessions', score: missedScore }
  ];
  factors.sort((a, b) => b.score - a.score);
  const topRiskFactor = factors[0].name;
  let recommendedAction;
  if (riskScore >= 0.7) {
    recommendedAction = 'Immediate outreach: schedule a check-in call and offer personalized support to re-engage the client.';
  } else if (riskScore >= 0.4) {
    recommendedAction = 'Send a motivational email or text, and consider offering a free session or discount to encourage attendance.';
  } else {
    recommendedAction = 'Monitor engagement trends and send periodic positive reinforcement messages.';
  }
  return {
    riskScore: Math.round(riskScore * 1000) / 1000,
    topRiskFactor,
    recommendedAction
  };
}
module.exports = { calculateChurnRiskScore };
