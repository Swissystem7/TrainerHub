function getReEngagementStrategy(clientProfile) {
  if (!clientProfile || typeof clientProfile !== 'object') {
    throw new TypeError('clientProfile must be an object');
  }
  const requiredFields = ['id', 'goals', 'lastWorkoutDate', 'lastLoginDate', 'totalCompletedWorkouts'];
  for (const field of requiredFields) {
    if (!(field in clientProfile)) {
      throw new TypeError(`Missing field: ${field}`);
    }
  }
  const { id, goals, lastWorkoutDate, lastLoginDate, totalCompletedWorkouts } = clientProfile;
  const effectiveGoals = Array.isArray(goals) && goals.length > 0 ? goals : ['general_fitness'];
  const now = new Date();
  const daysSinceLastWorkout = lastWorkoutDate ? Math.floor((now - new Date(lastWorkoutDate)) / (1000 * 60 * 60 * 24)) : null;
  const daysSinceLastLogin = lastLoginDate ? Math.floor((now - new Date(lastLoginDate)) / (1000 * 60 * 60 * 24)) : null;
  if (lastWorkoutDate === null && lastLoginDate === null) {
    return {
      action: 'send_motivation',
      messageTemplate: `Hi ${id}, we miss you! Let's get back on track with your ${effectiveGoals.join(', ')} goals. Start with a quick workout today!`,
      priority: 'high'
    };
  }
  if (daysSinceLastWorkout !== null && daysSinceLastWorkout > 14) {
    return {
      action: 'schedule_call',
      messageTemplate: `Hi ${id}, it's been a while since your last workout. Let's schedule a call to discuss your ${effectiveGoals.join(', ')} goals and get you back on track.`,
      priority: 'high'
    };
  }
  if (daysSinceLastLogin !== null && daysSinceLastLogin > 7) {
    return {
      action: 'send_motivation',
      messageTemplate: `Hey ${id}, we noticed you haven't logged in recently. Your ${effectiveGoals.join(', ')} goals are waiting for you! Come back and crush them.`,
      priority: 'medium'
    };
  }
  if (totalCompletedWorkouts < 3) {
    return {
      action: 'adjust_program',
      messageTemplate: `Hi ${id}, we've adjusted your program to better match your ${effectiveGoals.join(', ')} goals. Check out the new plan and let us know how it feels!`,
      priority: 'medium'
    };
  }
  return {
    action: 'no_action',
    messageTemplate: '',
    priority: 'low'
  };
}
module.exports = { getReEngagementStrategy };