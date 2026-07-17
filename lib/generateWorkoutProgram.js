function generateWorkoutProgram(clientProfile, programDuration, workoutDaysPerWeek) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const safeAge = clamp(clientProfile.age ?? 18, 10, 120);
  const age = clamp(safeAge, 18, 100);
  const gender = ['male','female','other'].includes(clientProfile.gender) ? clientProfile.gender : 'other';
  const fitnessLevel = ['beginner','intermediate','advanced'].includes(clientProfile.fitnessLevel) ? clientProfile.fitnessLevel : 'beginner';
  const goals = Array.isArray(clientProfile.goals) && clientProfile.goals.length > 0 ? clientProfile.goals : ['general_fitness'];
  const equipment = Array.isArray(clientProfile.availableEquipment) ? clientProfile.availableEquipment : [];
  const hasEquipment = equipment.length > 0 && !(equipment.length === 1 && equipment[0] === 'none');
  const injuries = Array.isArray(clientProfile.injuries) ? clientProfile.injuries : [];
  if (injuries.includes('all')) return { programId: generateId(), durationWeeks: 0, dailyWorkouts: [] };
  const previousWorkouts = Math.max(0, clientProfile.previousWorkouts ?? 0);
  const isNew = previousWorkouts < 5;
  const duration = clamp(programDuration ?? 1, 1, 52);
  const daysPerWeek = clamp(workoutDaysPerWeek ?? 1, 1, 7);
  const totalDays = duration * daysPerWeek;

  const isSenior = age > 60;
  const isAdvanced = fitnessLevel === 'advanced';
  const isBeginner = fitnessLevel === 'beginner';

  const bodyParts = ['chest','back','shoulders','biceps','triceps','legs','core'];
  const injuredParts = injuries.filter(p => bodyParts.includes(p));
  const safeParts = bodyParts.filter(p => !injuredParts.includes(p));

  const exercisePool = {
    chest: hasEquipment ? ['bench_press','dumbbell_fly','push_up','incline_press'] : ['push_up','wide_push_up','decline_push_up'],
    back: hasEquipment ? ['barbell_row','pull_up','lat_pulldown','dumbbell_row'] : ['bodyweight_row','superman','reverse_fly'],
    shoulders: hasEquipment ? ['overhead_press','lateral_raise','front_raise','upright_row'] : ['pike_push_up','wall_walk','arm_circles'],
    biceps: hasEquipment ? ['bicep_curl','hammer_curl','concentration_curl'] : ['bodyweight_curl','doorway_curl'],
    triceps: hasEquipment ? ['tricep_pushdown','overhead_extension','dips'] : ['bench_dips','tricep_push_up'],
    legs: hasEquipment ? ['squat','deadlift','lunges','leg_press'] : ['bodyweight_squat','lunges','glute_bridge','step_up'],
    core: ['plank','crunches','russian_twist','leg_raise','mountain_climber']
  };

  const warmUps = ['arm_circles','leg_swings','torso_twists','jumping_jacks','hip_circles'];
  const coolDowns = ['hamstring_stretch','quad_stretch','shoulder_stretch','cat_cow','child_pose'];

  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const generateExercisesForDay = (dayIndex) => {
    const usedNames = new Set();
    const exercises = [];
    const numExercises = isSenior ? 4 : (isAdvanced ? 6 : 5);
    const availableParts = safeParts.length > 0 ? safeParts : ['core'];
    const partsCycle = [];
    for (let i = 0; i < numExercises; i++) {
      partsCycle.push(availableParts[i % availableParts.length]);
    }
    const shuffledParts = shuffle(partsCycle);
    for (const part of shuffledParts) {
      const pool = exercisePool[part] || exercisePool.core;
      const filtered = pool.filter(e => !usedNames.has(e));
      if (filtered.length === 0) continue;
      const name = getRandom(filtered);
      usedNames.add(name);
      const sets = isSenior ? 2 : (isBeginner ? 3 : (isAdvanced ? 4 : 3));
      const reps = isSenior ? '10-12' : (isBeginner ? '8-12' : (isAdvanced ? '6-10' : '8-12'));
      const rest = isSenior ? 90 : (isAdvanced ? 60 : 45);
      const notes = [];
      if (injuredParts.includes(part)) notes.push('modified for injury');
      if (isSenior) notes.push('low intensity');
      if (isNew) notes.push('focus on form');
      exercises.push({ name, sets, reps, restSeconds: rest, notes: notes.join('; ') });
    }
    return exercises;
  };

  const dailyWorkouts = [];
  for (let d = 0; d < totalDays; d++) {
    const day = d + 1;
    const warmUp = getRandom(warmUps);
    const coolDown = getRandom(coolDowns);
    const exercises = generateExercisesForDay(d);
    dailyWorkouts.push({ day, warmUp, exercises, coolDown });
  }

  return {
    programId: generateId(),
    durationWeeks: duration,
    dailyWorkouts
  };
}

function generateId() {
  return 'prog_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

module.exports = { generateWorkoutProgram };