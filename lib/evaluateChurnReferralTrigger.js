function evaluateChurnReferralTrigger(clientId, metrics) {
  const RECENT_PROMPT_DAYS = 30;
  const defaultLastActiveDaysThreshold = 7;
  const defaultCompletedWorkoutsThreshold = 2;

  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new Error('Invalid client');
  }

  if (!metrics || typeof metrics !== 'object' || typeof metrics.lastActiveDays !== 'number' || typeof metrics.completedWorkouts !== 'number' || !Number.isInteger(metrics.lastActiveDays) || !Number.isInteger(metrics.completedWorkouts) || metrics.lastActiveDays < 1 || metrics.completedWorkouts < 0) {
    throw new TypeError('metrics must have lastActiveDays and completedWorkouts');
  }

  const parsedLastActive = Number.parseInt(process.env.LAST_ACTIVE_DAYS_THRESHOLD, 10);
  const parsedCompleted = Number.parseInt(process.env.COMPLETED_WORKOUTS_THRESHOLD, 10);
  const lastActiveDaysThreshold = Number.isInteger(parsedLastActive) && parsedLastActive >= 0 ? parsedLastActive : defaultLastActiveDaysThreshold;
  const completedWorkoutsThreshold = Number.isInteger(parsedCompleted) && parsedCompleted >= 0 ? parsedCompleted : defaultCompletedWorkoutsThreshold;

  const promptHistory = getPromptHistory(clientId);
  if (promptHistory && (Date.now() - promptHistory.lastPromptTimestamp) < RECENT_PROMPT_DAYS * 24 * 60 * 60 * 1000) {
    return { triggered: false, message: '' };
  }

  if (metrics.lastActiveDays > lastActiveDaysThreshold && metrics.completedWorkouts < completedWorkoutsThreshold) {
    recordPrompt(clientId);
    return { triggered: true, message: 'Refer a friend and get one free session!' };
  }

  return { triggered: false, message: '' };
}

function getPromptHistory(clientId) {
  const history = global.__promptHistory || {};
  return history[clientId] || null;
}

function recordPrompt(clientId) {
  if (!global.__promptHistory) {
    global.__promptHistory = {};
  }
  global.__promptHistory[clientId] = { lastPromptTimestamp: Date.now() };
}

module.exports = { evaluateChurnReferralTrigger };
