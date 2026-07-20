function predictClientChurn(clientData, windowDays = 30) {
  if (!Number.isFinite(windowDays) || windowDays < 0) throw new Error("windowDays must be non-negative");
  const workoutLogs = clientData && Array.isArray(clientData.workoutLogs) ? clientData.workoutLogs : [];
  if (!workoutLogs || workoutLogs.length === 0) {
    return { probability: 0.5, riskLevel: "medium" };
  }
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const recentLogs = workoutLogs.filter(log => log && Number.isFinite(Date.parse(log.date)) && new Date(log.date) >= cutoff);
  const expectedSessions = Math.round((windowDays / 7) * 3);
  const frequency = expectedSessions > 0 ? recentLogs.length / expectedSessions : 1;
  const completionRate = recentLogs.length > 0 ? recentLogs.reduce((sum, log) => sum + (log.completed ? 1 : 0), 0) / recentLogs.length : 0;
  const feedbackScores = recentLogs.map(log => log.feedbackScore).filter(score => Number.isFinite(score) && score >= 1 && score <= 5);
  const feedbackAvg = feedbackScores.length > 0 ? feedbackScores.reduce((a, b) => a + b, 0) / feedbackScores.length : 3;
  const probability = 0.4 * (1 - Math.min(frequency, 1)) + 0.3 * (1 - completionRate) + 0.3 * (1 - feedbackAvg / 5);
  const clamped = Math.max(0, Math.min(1, probability));
  const riskLevel = clamped < 0.3 ? "low" : clamped > 0.6 ? "high" : "medium";
  return { probability: clamped, riskLevel };
}
module.exports = { predictClientChurn };
