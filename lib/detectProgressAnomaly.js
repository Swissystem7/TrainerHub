function detectProgressAnomaly(clientId, exerciseId, newLogEntry, recentLogs) {
  if (!newLogEntry || !Number.isFinite(newLogEntry.sets) || !Number.isFinite(newLogEntry.reps) || !Number.isFinite(newLogEntry.weight)) {
    throw new TypeError('newLogEntry missing required numeric fields');
  }
  if (newLogEntry.sets < 0 || newLogEntry.reps < 0 || newLogEntry.weight < 0) {
    throw new TypeError('Negative values not allowed');
  }
  if (!Array.isArray(recentLogs) || recentLogs.length < 3) {
    return { isAnomaly: false, score: 0, reason: 'Insufficient data' };
  }
  if (recentLogs.some(log => !log || !Number.isFinite(log.sets) || !Number.isFinite(log.reps) || !Number.isFinite(log.weight) || log.sets < 0 || log.reps < 0 || log.weight < 0)) {
    throw new TypeError('Invalid recent log');
  }
  const newVolume = newLogEntry.sets * newLogEntry.reps * newLogEntry.weight;
  const volumes = recentLogs.map(log => log.sets * log.reps * log.weight);
  const n = volumes.length;
  const mean = volumes.reduce((a, b) => a + b, 0) / n;
  const variance = volumes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  if (std === 0) {
    return { isAnomaly: false, score: 0, reason: 'No variance in recent logs' };
  }
  const zScore = (newVolume - mean) / std;
  const isAnomaly = Math.abs(zScore) > 2.5;
  const reason = isAnomaly ? `Volume Z-score of ${zScore.toFixed(2)} exceeds threshold 2.5` : 'Normal';
  return { isAnomaly, score: zScore, reason };
}

module.exports = { detectProgressAnomaly };
