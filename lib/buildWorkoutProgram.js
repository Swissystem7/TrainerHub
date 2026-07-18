function buildWorkoutProgram(clientProfile, goals, options, exerciseLibrary) {
  const warnings = [];
  if (!clientProfile || typeof clientProfile.age !== 'number' || !clientProfile.fitnessLevel || !Array.isArray(clientProfile.injuries) || !Array.isArray(clientProfile.availableEquipment)) {
    throw new TypeError('Missing required fields in clientProfile');
  }
  const { age, fitnessLevel, injuries, availableEquipment } = clientProfile;
  let { numDays, sessionDuration, preferSplit } = options || {};
  if (!Array.isArray(goals)) {
    throw new TypeError('goals must be an array');
  }
  if (goals.length === 0) {
    goals = ['generalFitness'];
    warnings.push('No goals specified, defaulting to general fitness program with moderate intensity');
  }
  numDays = Number.isFinite(numDays) ? Math.min(7, Math.max(1, Math.trunc(numDays))) : 1;
  sessionDuration = Number.isFinite(sessionDuration) ? Math.min(120, Math.max(15, sessionDuration)) : 15;
  const hasStrength = goals.includes('strength');
  const hasHypertrophy = goals.includes('hypertrophy');
  const hasEndurance = goals.includes('endurance');
  const hasWeightLoss = goals.includes('weightLoss');
  const hasGeneral = goals.includes('generalFitness');
  if ((hasStrength && hasEndurance) || (hasStrength && hasWeightLoss && hasEndurance)) {
    warnings.push('Conflicting goals: strength and endurance high volume detected. Adjusted compromise: moderate sets with moderate reps');
  }
  if (hasHypertrophy && hasEndurance) {
    warnings.push('Conflicting goals: hypertrophy and endurance. Adjusted compromise: moderate volume with moderate rest');
  }
  const filteredExercises = exerciseLibrary.filter(ex => {
    if (injuries.length > 0 && ex.targetMuscle && injuries.some(inj => ex.targetMuscle.toLowerCase().includes(inj.toLowerCase()))) {
      return false;
    }
    if (availableEquipment.length > 0 && ex.equipment && !availableEquipment.includes(ex.equipment) && ex.equipment !== 'bodyweight') {
      return false;
    }
    return true;
  });
  if (filteredExercises.length === 0) {
    warnings.push('No exercises match criteria (injuries + equipment). Falling back to bodyweight exercises');
    const bodyweightExercises = exerciseLibrary.filter(ex => ex.equipment === 'bodyweight' && !injuries.some(inj => ex.targetMuscle && ex.targetMuscle.toLowerCase().includes(inj.toLowerCase())));
    if (bodyweightExercises.length > 0) {
      filteredExercises.push(...bodyweightExercises);
    } else {
      filteredExercises.push({ name: 'push-ups', targetMuscle: 'chest', equipment: 'bodyweight', difficulty: 'beginner', type: 'compound' });
      filteredExercises.push({ name: 'squats', targetMuscle: 'legs', equipment: 'bodyweight', difficulty: 'beginner', type: 'compound' });
    }
  }
  const difficultyMap = { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced' };
  const targetDifficulty = difficultyMap[fitnessLevel] || 'beginner';
  const suitableExercises = filteredExercises.filter(ex => ex.difficulty === targetDifficulty || ex.difficulty === 'beginner');
  const finalExercises = suitableExercises.length > 0 ? suitableExercises : filteredExercises;
  let sets, reps, rest;
  if (hasStrength) {
    sets = 4; reps = 6; rest = 120;
  } else if (hasHypertrophy) {
    sets = 3; reps = 10; rest = 60;
  } else if (hasEndurance) {
    sets = 3; reps = 15; rest = 30;
  } else if (hasWeightLoss) {
    sets = 3; reps = 12; rest = 45;
  } else {
    sets = 3; reps = 10; rest = 60;
  }
  if (hasStrength && hasEndurance) {
    sets = 3; reps = 10; rest = 60;
  }
  if (hasHypertrophy && hasEndurance) {
    sets = 3; reps = 12; rest = 45;
  }
  const days = [];
  let totalVolume = 0;
  const exercisesPerDay = Math.max(1, Math.floor(sessionDuration / 5));
  for (let d = 1; d <= numDays; d++) {
    const dayExercises = [];
    for (let i = 0; i < exercisesPerDay; i++) {
      const ex = finalExercises[i % finalExercises.length];
      dayExercises.push({ name: ex.name, sets, reps, rest });
      totalVolume += sets * reps;
    }
    days.push({ day: d, exercises: dayExercises });
  }
  return { program: { days, totalVolume }, warnings };
}
module.exports = { buildWorkoutProgram };
