'use strict';

const BODY_PARTS = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];

const GOAL_RX = {
  strength: { sets: 4, reps: '4-6', rest: 120 },
  hypertrophy: { sets: 3, reps: '8-12', rest: 60 },
  endurance: { sets: 3, reps: '12-15', rest: 45 }
};

const SPLIT_MUSCLES = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps'],
  legs: ['legs'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['legs', 'core'],
  full: ['chest', 'back', 'shoulders', 'legs', 'core']
};

const CATALOG = [
  { id: 'bodyweight_squat', muscles: ['legs'], equipment: ['none'] },
  { id: 'lunges', muscles: ['legs'], equipment: ['none', 'dumbbells'] },
  { id: 'glute_bridge', muscles: ['legs'], equipment: ['none'] },
  { id: 'step_up', muscles: ['legs'], equipment: ['none', 'dumbbells'] },
  { id: 'wall_sit', muscles: ['legs'], equipment: ['none'] },
  { id: 'calf_raise', muscles: ['legs'], equipment: ['none', 'dumbbells'] },
  { id: 'goblet_squat', muscles: ['legs'], equipment: ['dumbbells'] },
  { id: 'dumbbell_lunge', muscles: ['legs'], equipment: ['dumbbells'] },
  { id: 'romanian_deadlift_db', muscles: ['legs'], equipment: ['dumbbells'] },
  { id: 'dumbbell_step_up', muscles: ['legs'], equipment: ['dumbbells'] },
  { id: 'squat', muscles: ['legs'], equipment: ['barbell'] },
  { id: 'deadlift', muscles: ['legs', 'back'], equipment: ['barbell'] },
  { id: 'leg_press', muscles: ['legs'], equipment: ['machine'] },

  { id: 'push_up', muscles: ['chest'], equipment: ['none'] },
  { id: 'wide_push_up', muscles: ['chest'], equipment: ['none'] },
  { id: 'decline_push_up', muscles: ['chest'], equipment: ['none'] },
  { id: 'dumbbell_bench', muscles: ['chest'], equipment: ['dumbbells'] },
  { id: 'dumbbell_fly', muscles: ['chest'], equipment: ['dumbbells'] },
  { id: 'dumbbell_incline', muscles: ['chest'], equipment: ['dumbbells'] },
  { id: 'bench_press', muscles: ['chest'], equipment: ['barbell'] },
  { id: 'incline_press', muscles: ['chest'], equipment: ['barbell'] },

  { id: 'superman', muscles: ['back'], equipment: ['none'] },
  { id: 'bodyweight_row', muscles: ['back'], equipment: ['none'] },
  { id: 'reverse_fly_bw', muscles: ['back'], equipment: ['none'] },
  { id: 'dumbbell_row', muscles: ['back'], equipment: ['dumbbells'] },
  { id: 'reverse_fly', muscles: ['back'], equipment: ['dumbbells'] },
  { id: 'barbell_row', muscles: ['back'], equipment: ['barbell'] },
  { id: 'pull_up', muscles: ['back'], equipment: ['bar'] },
  { id: 'lat_pulldown', muscles: ['back'], equipment: ['machine'] },

  { id: 'pike_push_up', muscles: ['shoulders'], equipment: ['none'] },
  { id: 'arm_circles', muscles: ['shoulders'], equipment: ['none'] },
  { id: 'wall_walk', muscles: ['shoulders'], equipment: ['none'] },
  { id: 'dumbbell_ohp', muscles: ['shoulders'], equipment: ['dumbbells'] },
  { id: 'lateral_raise', muscles: ['shoulders'], equipment: ['dumbbells'] },
  { id: 'front_raise', muscles: ['shoulders'], equipment: ['dumbbells'] },
  { id: 'overhead_press', muscles: ['shoulders'], equipment: ['barbell'] },
  { id: 'upright_row', muscles: ['shoulders'], equipment: ['barbell', 'dumbbells'] },

  { id: 'bodyweight_curl', muscles: ['biceps'], equipment: ['none'] },
  { id: 'doorway_curl', muscles: ['biceps'], equipment: ['none'] },
  { id: 'bicep_curl', muscles: ['biceps'], equipment: ['dumbbells'] },
  { id: 'hammer_curl', muscles: ['biceps'], equipment: ['dumbbells'] },
  { id: 'concentration_curl', muscles: ['biceps'], equipment: ['dumbbells'] },

  { id: 'bench_dips', muscles: ['triceps'], equipment: ['none'] },
  { id: 'tricep_push_up', muscles: ['triceps'], equipment: ['none'] },
  { id: 'overhead_extension', muscles: ['triceps'], equipment: ['dumbbells'] },
  { id: 'tricep_kickback', muscles: ['triceps'], equipment: ['dumbbells'] },
  { id: 'tricep_pushdown', muscles: ['triceps'], equipment: ['machine'] },
  { id: 'dips', muscles: ['triceps'], equipment: ['bar'] },

  { id: 'plank', muscles: ['core'], equipment: ['none'] },
  { id: 'crunches', muscles: ['core'], equipment: ['none'] },
  { id: 'russian_twist', muscles: ['core'], equipment: ['none', 'dumbbells'] },
  { id: 'leg_raise', muscles: ['core'], equipment: ['none'] },
  { id: 'mountain_climber', muscles: ['core'], equipment: ['none'] }
];

const WARM_UPS = ['arm_circles', 'leg_swings', 'torso_twists', 'jumping_jacks', 'hip_circles'];
const COOL_DOWNS = ['hamstring_stretch', 'quad_stretch', 'shoulder_stretch', 'cat_cow', 'child_pose'];

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function generateId() {
  return 'prog_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function normalizeGoal(raw) {
  if (raw === 'strength') return 'strength';
  if (raw === 'endurance') return 'endurance';
  if (raw === 'hypertrophy' || raw === 'muscle_gain') return 'hypertrophy';
  return 'hypertrophy';
}

function prescriptionFor(goal, isSenior) {
  const base = GOAL_RX[goal] || GOAL_RX.hypertrophy;
  if (isSenior) {
    return { sets: Math.min(base.sets, 3), reps: base.reps, rest: Math.max(base.rest, 90) };
  }
  return { sets: base.sets, reps: base.reps, rest: base.rest };
}

function userCanDo(ex, userEquipment) {
  const have = new Set((userEquipment || []).filter(function (e) { return e && e !== 'none'; }));
  const options = ex.equipment && ex.equipment.length ? ex.equipment : ['none'];
  return options.some(function (eq) { return eq === 'none' || have.has(eq); });
}

function splitNameForDay(dayIndex, daysPerWeek) {
  if (daysPerWeek <= 1) return 'full';
  if (daysPerWeek === 2) return ['upper', 'lower'][dayIndex % 2];
  if (daysPerWeek === 3) return ['push', 'pull', 'legs'][dayIndex % 3];
  if (daysPerWeek === 4) return ['upper', 'lower', 'upper', 'lower'][dayIndex % 4];
  return ['push', 'pull', 'legs', 'upper', 'lower'][dayIndex % 5];
}

function musclesForDay(dayIndex, daysPerWeek, targetMuscles, injuredParts) {
  const injured = new Set(injuredParts);
  const requested = (targetMuscles || []).filter(function (m) {
    return BODY_PARTS.includes(m) && !injured.has(m);
  });
  if (requested.length) return requested;

  const split = splitNameForDay(dayIndex, daysPerWeek);
  const fromSplit = (SPLIT_MUSCLES[split] || SPLIT_MUSCLES.full).filter(function (m) {
    return !injured.has(m);
  });
  return fromSplit.length ? fromSplit : ['core'];
}

function pickExercises(dayIndex, muscles, pool, count, rx, notes) {
  const used = new Set();
  const exercises = [];
  let slot = 0;
  let guard = 0;
  while (exercises.length < count && guard < 48) {
    const muscle = muscles[slot % muscles.length];
    const candidates = pool.filter(function (ex) {
      return !used.has(ex.id) && ex.muscles.indexOf(muscle) !== -1;
    });
    if (candidates.length) {
      const pick = candidates[(dayIndex + slot) % candidates.length];
      used.add(pick.id);
      exercises.push({
        name: pick.id,
        sets: rx.sets,
        reps: rx.reps,
        restSeconds: rx.rest,
        notes: notes
      });
    }
    slot++;
    guard++;
    if (slot > muscles.length && candidates.length === 0 && exercises.length === 0) {
      const fallback = pool.filter(function (ex) { return !used.has(ex.id); });
      if (!fallback.length) break;
      const pick = fallback[dayIndex % fallback.length];
      used.add(pick.id);
      exercises.push({
        name: pick.id,
        sets: rx.sets,
        reps: rx.reps,
        restSeconds: rx.rest,
        notes: notes
      });
    }
  }
  return exercises;
}

function generateWorkoutProgram(clientProfile, programDuration, workoutDaysPerWeek) {
  clientProfile = clientProfile || {};
  const safeAge = clamp(clientProfile.age ?? 18, 10, 120);
  const age = clamp(safeAge, 18, 100);
  const fitnessLevel = ['beginner', 'intermediate', 'advanced'].includes(clientProfile.fitnessLevel)
    ? clientProfile.fitnessLevel
    : 'beginner';
  const goals = Array.isArray(clientProfile.goals) && clientProfile.goals.length
    ? clientProfile.goals
    : ['general_fitness'];
  const equipment = Array.isArray(clientProfile.availableEquipment)
    ? clientProfile.availableEquipment
    : [];
  const injuries = Array.isArray(clientProfile.injuries) ? clientProfile.injuries : [];
  if (injuries.includes('all')) {
    return { programId: generateId(), durationWeeks: 0, dailyWorkouts: [] };
  }

  const targetMuscles = Array.isArray(clientProfile.targetMuscles)
    ? clientProfile.targetMuscles
    : [];
  const previousWorkouts = Math.max(0, clientProfile.previousWorkouts ?? 0);
  const isNew = previousWorkouts < 5;
  const duration = clamp(programDuration ?? 1, 1, 52);
  const daysPerWeek = clamp(workoutDaysPerWeek ?? 1, 1, 7);
  const totalDays = duration * daysPerWeek;
  const isSenior = age > 60;
  const injuredParts = injuries.filter(function (p) { return BODY_PARTS.includes(p); });
  const goalKey = normalizeGoal(goals[0]);
  const rx = prescriptionFor(goalKey, isSenior);

  const pool = CATALOG.filter(function (ex) {
    if (!userCanDo(ex, equipment)) return false;
    if (ex.muscles.some(function (m) { return injuredParts.indexOf(m) !== -1; })) return false;
    return true;
  });

  const noteParts = [];
  if (isSenior) noteParts.push('low intensity');
  if (isNew) noteParts.push('focus on form');
  const notes = noteParts.join('; ');

  const numExercises = isSenior ? 4 : (fitnessLevel === 'advanced' ? 6 : fitnessLevel === 'beginner' ? 4 : 5);

  const dailyWorkouts = [];
  for (let d = 0; d < totalDays; d++) {
    const split = splitNameForDay(d, daysPerWeek);
    const muscles = musclesForDay(d, daysPerWeek, targetMuscles, injuredParts);
    const exercises = pickExercises(d, muscles, pool, numExercises, rx, notes);
    const warmUp = WARM_UPS[d % WARM_UPS.length];
    const coolDown = COOL_DOWNS[d % COOL_DOWNS.length];
    dailyWorkouts.push({
      day: d + 1,
      split: targetMuscles.length ? 'focus' : split,
      warmUp: warmUp,
      exercises: exercises,
      coolDown: coolDown
    });
  }

  return {
    programId: generateId(),
    durationWeeks: duration,
    dailyWorkouts: dailyWorkouts
  };
}

module.exports = {
  generateWorkoutProgram,
  normalizeGoal,
  prescriptionFor,
  splitNameForDay,
  userCanDo,
  CATALOG
};
