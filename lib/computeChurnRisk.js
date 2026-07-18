function computeChurnRisk(clientId, activityLog) {
  if (!activityLog || activityLog.length === 0) {
    return { score: 0, flags: ['insufficient_data'] };
  }
  const flags = [];
  const now = new Date();
  let attendedCount = 0;
  let canceledCount = 0;
  let consecutiveCancellations = 0;
  let maxConsecutiveCancellations = 0;
  let lastBookedDate = null;
  const chronologicalLog = [...activityLog].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (let i = 0; i < chronologicalLog.length; i++) {
    const entry = chronologicalLog[i];
    if (entry.attended) attendedCount++;
    if (entry.canceled) {
      canceledCount++;
      consecutiveCancellations++;
      if (consecutiveCancellations > maxConsecutiveCancellations) {
        maxConsecutiveCancellations = consecutiveCancellations;
      }
    } else {
      consecutiveCancellations = 0;
    }
    if (entry.booked) {
      const bookedDate = new Date(entry.date);
      if (!Number.isNaN(bookedDate.getTime())) lastBookedDate = bookedDate;
    }
  }
  if (maxConsecutiveCancellations >= 2) {
    flags.push('frequent_cancellation');
  }
  if (lastBookedDate) {
    const daysSinceLastBooking = Math.floor((now - lastBookedDate) / (1000 * 60 * 60 * 24));
    if (daysSinceLastBooking > 14) {
      flags.push('engagement_drop');
    }
  } else {
    flags.push('engagement_drop');
  }
  const totalEntries = activityLog.length;
  const attendanceRatio = attendedCount / totalEntries;
  const cancellationRatio = canceledCount / totalEntries;
  let score = 0;
  if (attendanceRatio === 1) {
    score = 0;
  } else {
    score = (1 - attendanceRatio) * 0.6 + cancellationRatio * 0.4;
  }
  if (flags.includes('frequent_cancellation')) score = Math.min(score + 0.2, 1);
  if (flags.includes('engagement_drop')) score = Math.min(score + 0.3, 1);
  score = Math.max(0, Math.min(1, score));
  return { score, flags };
}
module.exports = { computeChurnRisk };
