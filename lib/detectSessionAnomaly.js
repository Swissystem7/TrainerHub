function detectSessionAnomaly(sessionLog, expectedPattern) {
  if (!sessionLog || typeof sessionLog !== 'object') throw new TypeError('sessionLog must be an object');
  if (!expectedPattern || typeof expectedPattern !== 'object') throw new TypeError('expectedPattern must be an object');
  if (typeof sessionLog.clientId !== 'string' || sessionLog.clientId === '') throw new TypeError('clientId must be a non-empty string');
  if (typeof sessionLog.startTime !== 'string' || typeof sessionLog.endTime !== 'string') throw new TypeError('startTime and endTime must be strings');
  if (isNaN(Date.parse(sessionLog.startTime)) || isNaN(Date.parse(sessionLog.endTime))) throw new TypeError('startTime or endTime is not a valid ISO string');
  if (typeof sessionLog.durationMinutes !== 'number' || sessionLog.durationMinutes < 0) throw new TypeError('durationMinutes must be a non-negative number');
  if (sessionLog.completed !== undefined && typeof sessionLog.completed !== 'boolean') throw new TypeError('completed must be a boolean if provided');

  const minRestMinutes = expectedPattern.minRestMinutes !== undefined ? expectedPattern.minRestMinutes : 30;
  const maxDailySessions = expectedPattern.maxDailySessions !== undefined ? expectedPattern.maxDailySessions : 3;
  const maxDurationMinutes = expectedPattern.maxDurationMinutes !== undefined ? expectedPattern.maxDurationMinutes : 180;
  const minDurationMinutes = expectedPattern.minDurationMinutes !== undefined ? expectedPattern.minDurationMinutes : 1;
  const maxSpeedFactor = expectedPattern.maxSpeedFactor !== undefined ? expectedPattern.maxSpeedFactor : 1.5;

  const reasons = [];
  const start = new Date(sessionLog.startTime);
  const end = new Date(sessionLog.endTime);

  if (end < start) {
    reasons.push('endTime before startTime');
  }

  const diffMinutes = (end - start) / 60000;
  if (Math.abs(diffMinutes - sessionLog.durationMinutes) > 2) {
    reasons.push('durationMinutes inconsistent with startTime/endTime difference');
  }

  if (sessionLog.durationMinutes > maxDurationMinutes) {
    reasons.push('session duration exceeds maxDurationMinutes');
  }
  if (sessionLog.durationMinutes < minDurationMinutes) {
    reasons.push('session duration below minDurationMinutes');
  }

  const sessionDate = start.toISOString().slice(0, 10);
  const dailyCount = sessionLog.dailySessionCount !== undefined ? sessionLog.dailySessionCount : 1;
  if (dailyCount > maxDailySessions) {
    reasons.push('exceeded maxDailySessions for same client on same day');
  }

  if (Array.isArray(sessionLog.timestamps) && sessionLog.timestamps.length > 1) {
    const validTimestamps = sessionLog.timestamps.filter(t => !isNaN(Date.parse(t)));
    if (validTimestamps.length >= 2) {
      const firstTs = new Date(validTimestamps[0]);
      const lastTs = new Date(validTimestamps[validTimestamps.length - 1]);
      const expectedDuration = (lastTs - firstTs) / 60000;
      if (expectedDuration > 0 && sessionLog.durationMinutes / expectedDuration > maxSpeedFactor) {
        reasons.push('duration exceeds maxSpeedFactor relative to timestamps');
      }
    }
  }

  const isAnomaly = reasons.length > 0;
  const confidence = isAnomaly ? Math.min(1, reasons.length * 0.3) : 0;

  return { isAnomaly, reasons, confidence };
}

module.exports = { detectSessionAnomaly };