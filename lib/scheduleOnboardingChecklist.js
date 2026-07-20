function scheduleOnboardingChecklist(trainerId, clientId, startDate, preferences) {
  if (typeof trainerId !== 'string' || !trainerId.trim() || typeof clientId !== 'string' || !clientId.trim()) throw new Error("trainerId or clientId empty");
  const now = new Date();
  const baseDate = startDate ? new Date(startDate) : new Date(now);
  if (Number.isNaN(baseDate.getTime())) throw new Error('Invalid startDate');
  const effectiveStart = baseDate > now ? baseDate : now;
  const days = (preferences && Array.isArray(preferences.checklistDays) && preferences.checklistDays.length > 0)
    ? [...new Set(preferences.checklistDays.filter(day => Number.isInteger(day) && day >= 0))]
    : [1, 3, 7, 14];
  const taskMap = {
    1: { taskType: "schedule_intro", description: "Schedule introductory session" },
    3: { taskType: "first_checkin", description: "First check-in with client" },
    7: { taskType: "progress_review", description: "Review client progress" },
    14: { taskType: "retention_call", description: "Retention call with client" }
  };
  const tasks = days.map(day => {
    const dueDate = new Date(effectiveStart);
    dueDate.setUTCDate(dueDate.getUTCDate() + day);
    const taskInfo = taskMap[day] || { taskType: "custom", description: `Custom task on day ${day}` };
    return { taskType: taskInfo.taskType, dueDate, description: taskInfo.description };
  });
  tasks.sort((a, b) => a.dueDate - b.dueDate);
  return { tasks };
}
module.exports = { scheduleOnboardingChecklist };
