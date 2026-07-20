function generateReEngagementMessage(clientName, lastWorkoutDate, daysSinceLastWorkout, options) {
  if (typeof clientName !== 'string' || clientName.trim() === '') {
    return { error: 'Invalid clientName' };
  }
  if (typeof daysSinceLastWorkout !== 'number' || Number.isNaN(daysSinceLastWorkout) || daysSinceLastWorkout < 0 || (lastWorkoutDate !== null && !Number.isFinite(daysSinceLastWorkout))) {
    return { error: 'daysSinceLastWorkout cannot be negative' };
  }
  const maxDaysForSoftReminder = (options && Number.isFinite(options.maxDaysForSoftReminder) && options.maxDaysForSoftReminder >= 0) ? options.maxDaysForSoftReminder : 7;
  if (lastWorkoutDate === null) {
    return { message: `Ready to start your fitness journey, ${clientName}? Let's go!` };
  }
  if (daysSinceLastWorkout <= maxDaysForSoftReminder) {
    return { message: `Hey ${clientName}, haven't seen you in a few days! Your next workout is waiting.` };
  }
  if (daysSinceLastWorkout <= 30) {
    return { message: `${clientName}, it's been a while! Let's get back on track – book a session today.` };
  }
  return { message: `We miss you, ${clientName}! Here's a free consultation to restart your routine.` };
}
module.exports = { generateReEngagementMessage };
