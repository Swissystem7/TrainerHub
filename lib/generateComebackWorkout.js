function generateComebackWorkout(lastCompletedSession, daysSinceLastSession, clientLevel = 'beginner') {
  if (!Number.isFinite(daysSinceLastSession) || daysSinceLastSession < 0) daysSinceLastSession = 0;
  const validLevels = ['beginner', 'intermediate', 'advanced'];
  if (!validLevels.includes(clientLevel)) clientLevel = 'beginner';
  const levelBonus = clientLevel === 'intermediate' ? 1 : clientLevel === 'advanced' ? 2 : 0;

  let exercises = [];
  let motivationalMessage = '';

  if (!lastCompletedSession || !lastCompletedSession.exercises || lastCompletedSession.exercises.length === 0) {
    exercises = [
      { name: 'squat', sets: 2 + levelBonus, reps: 10, notes: '' },
      { name: 'pushup', sets: 2 + levelBonus, reps: 8, notes: '' },
      { name: 'plank', sets: 2 + levelBonus, reps: 20, notes: 'seconds' }
    ];
    motivationalMessage = daysSinceLastSession > 14
      ? 'Welcome back! Start with this gentle session to rebuild momentum.'
      : 'Great to see you! Here is a session tailored to your recent progress.';
    return { workout: { exercises }, motivationalMessage };
  }

  const rawExercises = lastCompletedSession.exercises.map(e => ({
    name: e.name,
    sets: Number.isFinite(e.sets) && e.sets > 0 ? e.sets : 1,
    reps: Number.isFinite(e.reps) && e.reps > 0 ? e.reps : 1
  }));

  let setsMultiplier = 1;
  let repsMultiplier = 1;
  let notes = '';

  if (daysSinceLastSession <= 3) {
    setsMultiplier = 1;
    repsMultiplier = 1;
  } else if (daysSinceLastSession <= 7) {
    setsMultiplier = 0.8;
    repsMultiplier = 1;
  } else if (daysSinceLastSession <= 14) {
    setsMultiplier = 0.6;
    repsMultiplier = 0.7;
  } else {
    setsMultiplier = 0.4;
    repsMultiplier = 0.5;
    notes = 'light';
  }

  exercises = rawExercises.map(e => {
    let sets = Math.max(1, Math.round(e.sets * setsMultiplier) + levelBonus);
    let reps = Math.max(1, Math.round(e.reps * repsMultiplier));
    return {
      name: e.name,
      sets: sets,
      reps: reps,
      notes: notes
    };
  });

  motivationalMessage = daysSinceLastSession > 14
    ? 'Welcome back! Start with this gentle session to rebuild momentum.'
    : 'Great to see you! Here is a session tailored to your recent progress.';

  return { workout: { exercises }, motivationalMessage };
}

module.exports = { generateComebackWorkout };
