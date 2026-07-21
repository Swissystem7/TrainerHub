function validateWorkoutSafety(workout, clientProfile) {
  if (typeof workout !== 'object' || workout === null || typeof clientProfile !== 'object' || clientProfile === null) {
    throw new TypeError();
  }
  if (!Array.isArray(workout.exercises)) {
    throw new TypeError();
  }
  if (!Array.isArray(clientProfile.conditions)) {
    throw new TypeError();
  }
  const conditions = [...clientProfile.conditions];
  if (Array.isArray(clientProfile.injuries)) {
    conditions.push(...clientProfile.injuries);
  }
  if (conditions.length === 0 || workout.exercises.length === 0) {
    return [];
  }
  const lookup = {
    'squat': ['knee injury'],
    'deadlift': ['back injury', 'hernia'],
    'bench press': ['shoulder injury'],
    'running': ['knee injury', 'pregnancy'],
    'jumping jacks': ['pregnancy', 'hypertension'],
    'plank': ['pregnancy'],
    'burpee': ['pregnancy', 'hypertension', 'knee injury'],
    'leg press': ['knee injury'],
    'overhead press': ['shoulder injury', 'hypertension'],
    'bicep curl': []
  };
  const seen = new Set();
  const issues = [];
  for (const exercise of workout.exercises) {
    if (typeof exercise !== 'object' || exercise === null) continue;
    const id = exercise.id;
    if (typeof id !== 'string') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const name = exercise.name;
    if (typeof name !== 'string') continue;
    const lowerName = name.toLowerCase();
    const muscleGroups = Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups.map(m => m.toLowerCase()) : [];
    const matchedConditions = lookup[lowerName] || [];
    for (const condition of conditions) {
      const lowerCondition = condition.toLowerCase();
      if (matchedConditions.includes(lowerCondition)) {
        let issue = '';
        let severity = 'warning';
        if (lowerCondition === 'knee injury' && (lowerName === 'squat' || lowerName === 'leg press' || lowerName === 'burpee' || lowerName === 'running')) {
          issue = `Avoid ${name} with knee injury`;
          severity = 'blocker';
        } else if (lowerCondition === 'pregnancy' && (lowerName === 'burpee' || lowerName === 'jumping jacks' || lowerName === 'plank' || lowerName === 'running')) {
          issue = `Avoid ${name} during pregnancy`;
          severity = 'blocker';
        } else if (lowerCondition === 'hypertension' && (lowerName === 'burpee' || lowerName === 'jumping jacks' || lowerName === 'overhead press')) {
          issue = `Avoid ${name} with hypertension`;
          severity = 'blocker';
        } else if (lowerCondition === 'back injury' && lowerName === 'deadlift') {
          issue = `Avoid ${name} with back injury`;
          severity = 'blocker';
        } else if (lowerCondition === 'hernia' && lowerName === 'deadlift') {
          issue = `Avoid ${name} with hernia`;
          severity = 'blocker';
        } else if (lowerCondition === 'shoulder injury' && (lowerName === 'bench press' || lowerName === 'overhead press')) {
          issue = `Avoid ${name} with shoulder injury`;
          severity = 'blocker';
        } else {
          issue = `Caution: ${name} may aggravate ${condition}`;
          severity = 'warning';
        }
        issues.push({ exerciseId: id, issue, severity });
      }
    }
  }
  return issues;
}

module.exports = { validateWorkoutSafety };