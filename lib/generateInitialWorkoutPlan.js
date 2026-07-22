function generateInitialWorkoutPlan(clientProfile) {
  const goal = ['strength','hypertrophy','endurance','general'].includes(clientProfile.goal) ? clientProfile.goal : 'general';
  const fitnessLevel = ['beginner','intermediate','advanced'].includes(clientProfile.fitnessLevel) ? clientProfile.fitnessLevel : 'beginner';
  const equipment = Array.isArray(clientProfile.equipment) ? clientProfile.equipment : [];
  const restrictions = Array.isArray(clientProfile.restrictions) ? clientProfile.restrictions : [];
  const hasEquipment = equipment.length > 0;

  const templates = {
    strength: {
      beginner: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Glute Bridge', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Bird Dog', tags: ['core','bodyweight'], equipment: [] }
      ],
      intermediate: [
        { name: 'Goblet Squat', tags: ['lower'], equipment: ['dumbbell','kettlebell'] },
        { name: 'Bench Press', tags: ['upper','chest'], equipment: ['barbell','dumbbell','bench'] },
        { name: 'Bent Over Row', tags: ['upper','back'], equipment: ['barbell','dumbbell'] },
        { name: 'Overhead Press', tags: ['upper','shoulders'], equipment: ['barbell','dumbbell'] },
        { name: 'Deadlift', tags: ['lower','back'], equipment: ['barbell'] },
        { name: 'Pull Up', tags: ['upper','back','bodyweight'], equipment: ['pullup bar'] },
        { name: 'Lunges', tags: ['lower'], equipment: ['dumbbell'] },
        { name: 'Face Pull', tags: ['upper','shoulders'], equipment: ['cable','band'] }
      ],
      advanced: [
        { name: 'Barbell Squat', tags: ['lower'], equipment: ['barbell','squat rack'] },
        { name: 'Bench Press', tags: ['upper','chest'], equipment: ['barbell','bench'] },
        { name: 'Deadlift', tags: ['lower','back'], equipment: ['barbell'] },
        { name: 'Overhead Press', tags: ['upper','shoulders'], equipment: ['barbell'] },
        { name: 'Barbell Row', tags: ['upper','back'], equipment: ['barbell'] },
        { name: 'Pull Up', tags: ['upper','back','bodyweight'], equipment: ['pullup bar'] },
        { name: 'Dips', tags: ['upper','chest','triceps'], equipment: ['dip bar','parallel bars'] },
        { name: 'Romanian Deadlift', tags: ['lower','hamstrings'], equipment: ['barbell','dumbbell'] },
        { name: 'Lunges', tags: ['lower'], equipment: ['barbell','dumbbell'] },
        { name: 'Face Pull', tags: ['upper','shoulders'], equipment: ['cable','band'] }
      ]
    },
    hypertrophy: {
      beginner: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Glute Bridge', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Bird Dog', tags: ['core','bodyweight'], equipment: [] }
      ],
      intermediate: [
        { name: 'Dumbbell Squat', tags: ['lower'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Bench Press', tags: ['upper','chest'], equipment: ['dumbbell','bench'] },
        { name: 'Dumbbell Row', tags: ['upper','back'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Shoulder Press', tags: ['upper','shoulders'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Curl', tags: ['upper','biceps'], equipment: ['dumbbell'] },
        { name: 'Tricep Pushdown', tags: ['upper','triceps'], equipment: ['cable','band'] },
        { name: 'Leg Press', tags: ['lower'], equipment: ['leg press machine'] },
        { name: 'Lat Pulldown', tags: ['upper','back'], equipment: ['cable','lat pulldown machine'] }
      ],
      advanced: [
        { name: 'Barbell Squat', tags: ['lower'], equipment: ['barbell','squat rack'] },
        { name: 'Incline Bench Press', tags: ['upper','chest'], equipment: ['barbell','dumbbell','bench'] },
        { name: 'Deadlift', tags: ['lower','back'], equipment: ['barbell'] },
        { name: 'Barbell Row', tags: ['upper','back'], equipment: ['barbell'] },
        { name: 'Overhead Press', tags: ['upper','shoulders'], equipment: ['barbell','dumbbell'] },
        { name: 'Pull Up', tags: ['upper','back','bodyweight'], equipment: ['pullup bar'] },
        { name: 'Dips', tags: ['upper','chest','triceps'], equipment: ['dip bar','parallel bars'] },
        { name: 'Romanian Deadlift', tags: ['lower','hamstrings'], equipment: ['barbell','dumbbell'] },
        { name: 'Barbell Curl', tags: ['upper','biceps'], equipment: ['barbell'] },
        { name: 'Skull Crusher', tags: ['upper','triceps'], equipment: ['barbell','dumbbell','bench'] },
        { name: 'Lunges', tags: ['lower'], equipment: ['barbell','dumbbell'] },
        { name: 'Face Pull', tags: ['upper','shoulders'], equipment: ['cable','band'] }
      ]
    },
    endurance: {
      beginner: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Glute Bridge', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Bird Dog', tags: ['core','bodyweight'], equipment: [] }
      ],
      intermediate: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Lunges', tags: ['lower'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Row', tags: ['upper','back'], equipment: ['dumbbell'] },
        { name: 'Mountain Climber', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Jumping Jacks', tags: ['cardio','bodyweight'], equipment: [] },
        { name: 'Burpee', tags: ['cardio','bodyweight'], equipment: [] }
      ],
      advanced: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Lunges', tags: ['lower'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Row', tags: ['upper','back'], equipment: ['dumbbell'] },
        { name: 'Mountain Climber', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Jumping Jacks', tags: ['cardio','bodyweight'], equipment: [] },
        { name: 'Burpee', tags: ['cardio','bodyweight'], equipment: [] },
        { name: 'Kettlebell Swing', tags: ['lower','cardio'], equipment: ['kettlebell'] },
        { name: 'Box Jump', tags: ['lower','cardio'], equipment: ['box'] },
        { name: 'Battle Rope', tags: ['cardio','upper'], equipment: ['battle rope'] },
        { name: 'Rowing Machine', tags: ['cardio','full body'], equipment: ['rowing machine'] }
      ]
    },
    general: {
      beginner: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Glute Bridge', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Bird Dog', tags: ['core','bodyweight'], equipment: [] }
      ],
      intermediate: [
        { name: 'Bodyweight Squat', tags: ['lower','bodyweight'], equipment: [] },
        { name: 'Push Up', tags: ['upper','bodyweight','chest'], equipment: [] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Lunges', tags: ['lower'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Row', tags: ['upper','back'], equipment: ['dumbbell'] },
        { name: 'Dumbbell Bench Press', tags: ['upper','chest'], equipment: ['dumbbell','bench'] },
        { name: 'Dumbbell Shoulder Press', tags: ['upper','shoulders'], equipment: ['dumbbell'] },
        { name: 'Deadlift', tags: ['lower','back'], equipment: ['barbell'] }
      ],
      advanced: [
        { name: 'Barbell Squat', tags: ['lower'], equipment: ['barbell','squat rack'] },
        { name: 'Bench Press', tags: ['upper','chest'], equipment: ['barbell','bench'] },
        { name: 'Deadlift', tags: ['lower','back'], equipment: ['barbell'] },
        { name: 'Overhead Press', tags: ['upper','shoulders'], equipment: ['barbell'] },
        { name: 'Barbell Row', tags: ['upper','back'], equipment: ['barbell'] },
        { name: 'Pull Up', tags: ['upper','back','bodyweight'], equipment: ['pullup bar'] },
        { name: 'Dips', tags: ['upper','chest','triceps'], equipment: ['dip bar','parallel bars'] },
        { name: 'Romanian Deadlift', tags: ['lower','hamstrings'], equipment: ['barbell','dumbbell'] },
        { name: 'Lunges', tags: ['lower'], equipment: ['barbell','dumbbell'] },
        { name: 'Face Pull', tags: ['upper','shoulders'], equipment: ['cable','band'] },
        { name: 'Plank', tags: ['core','bodyweight'], equipment: [] },
        { name: 'Mountain Climber', tags: ['core','bodyweight'], equipment: [] }
      ]
    }
  };

  const templateExercises = templates[goal][fitnessLevel];
  const maxExercises = fitnessLevel === 'beginner' ? 3 : fitnessLevel === 'advanced' ? 6 : 4;

  let filteredExercises = templateExercises.filter(ex => {
    if (!hasEquipment && ex.equipment.length > 0) return false;
    if (hasEquipment && ex.equipment.length > 0) {
      const hasMatch = ex.equipment.some(eq => equipment.includes(eq));
      if (!hasMatch) return false;
    }
    if (restrictions.length > 0) {
      const hasRestriction = restrictions.some(r => ex.tags.includes(r));
      if (hasRestriction) return false;
    }
    return true;
  });

  if (filteredExercises.length === 0) return null;

  const selectedExercises = filteredExercises.slice(0, maxExercises);

  const days = [];
  const dayCount = fitnessLevel === 'beginner' ? 3 : fitnessLevel === 'advanced' ? 5 : 4;
  for (let i = 0; i < dayCount; i++) {
    const dayExercises = selectedExercises.map(ex => ({
      name: ex.name,
      sets: fitnessLevel === 'beginner' ? 2 : fitnessLevel === 'advanced' ? 4 : 3,
      reps: goal === 'endurance' ? 15 : goal === 'strength' ? 6 : 10,
      rest: goal === 'endurance' ? 30 : goal === 'strength' ? 120 : 60
    }));
    days.push({
      day: `Day ${i + 1}`,
      exercises: dayExercises
    });
  }

  return {
    planName: `${goal.charAt(0).toUpperCase() + goal.slice(1)} ${fitnessLevel.charAt(0).toUpperCase() + fitnessLevel.slice(1)} Plan`,
    days: days
  };
}

module.exports = { generateInitialWorkoutPlan };