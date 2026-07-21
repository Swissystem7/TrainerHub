function generateProgram(templateId, clientProfile) {
  const templates = {
    'strength-beginner': {
      name: 'Strength Beginner',
      exercises: [
        { name: 'Push-ups', sets: 3, reps: 10, equipment: ['bodyweight'], goals: ['strength', 'general fitness'] },
        { name: 'Squats', sets: 3, reps: 12, equipment: ['bodyweight'], goals: ['strength', 'general fitness'] },
        { name: 'Plank', sets: 3, reps: 30, equipment: ['bodyweight'], goals: ['core', 'general fitness'] },
        { name: 'Dumbbell Rows', sets: 3, reps: 10, equipment: ['dumbbells'], goals: ['strength'] },
        { name: 'Dumbbell Press', sets: 3, reps: 10, equipment: ['dumbbells'], goals: ['strength'] },
        { name: 'Lunges', sets: 3, reps: 10, equipment: ['bodyweight'], goals: ['strength', 'general fitness'] },
        { name: 'Bicycle Crunches', sets: 3, reps: 15, equipment: ['bodyweight'], goals: ['core'] },
        { name: 'Glute Bridges', sets: 3, reps: 12, equipment: ['bodyweight'], goals: ['strength', 'general fitness'] },
      ],
      days: 3
    },
    'cardio-intermediate': {
      name: 'Cardio Intermediate',
      exercises: [
        { name: 'Jumping Jacks', sets: 3, reps: 30, equipment: ['bodyweight'], goals: ['cardio', 'general fitness'] },
        { name: 'High Knees', sets: 3, reps: 20, equipment: ['bodyweight'], goals: ['cardio'] },
        { name: 'Burpees', sets: 3, reps: 10, equipment: ['bodyweight'], goals: ['cardio', 'strength'] },
        { name: 'Mountain Climbers', sets: 3, reps: 20, equipment: ['bodyweight'], goals: ['cardio', 'core'] },
        { name: 'Jump Squats', sets: 3, reps: 12, equipment: ['bodyweight'], goals: ['cardio', 'strength'] },
        { name: 'Box Jumps', sets: 3, reps: 10, equipment: ['box'], goals: ['cardio', 'strength'] },
        { name: 'Rowing Machine', sets: 3, reps: 500, equipment: ['rower'], goals: ['cardio'] },
        { name: 'Battle Ropes', sets: 3, reps: 30, equipment: ['ropes'], goals: ['cardio', 'strength'] },
      ],
      days: 4
    }
  };

  if (!templates[templateId]) {
    return { error: 'Template not found' };
  }

  if (!clientProfile || !Array.isArray(clientProfile.goals) || clientProfile.goals.length === 0) {
    return { error: 'At least one goal required' };
  }

  const template = templates[templateId];
  const equipmentSet = new Set((Array.isArray(clientProfile.equipment) ? clientProfile.equipment : []).map(e => String(e).toLowerCase()));
  const goalsSet = new Set(clientProfile.goals.map(g => String(g).toLowerCase()));
  const limitations = (Array.isArray(clientProfile.limitations) ? clientProfile.limitations : []).map(l => String(l).toLowerCase());

  let availableExercises = template.exercises.filter(ex => {
    const exEquipment = ex.equipment.map(e => e.toLowerCase());
    const exGoals = ex.goals.map(g => g.toLowerCase());
    const hasEquipment = exEquipment.some(eq => equipmentSet.has(eq));
    const hasGoal = exGoals.some(g => goalsSet.has(g));
    return hasEquipment && hasGoal;
  });

  if (availableExercises.length === 0) {
    return { error: 'No exercises available for given equipment' };
  }

  const seen = new Set();
  availableExercises = availableExercises.filter(ex => {
    const lower = ex.name.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  const weeks = [];
  const exercisesPerDay = Math.ceil(availableExercises.length / template.days);
  for (let day = 1; day <= template.days; day++) {
    const start = (day - 1) * exercisesPerDay;
    const dayExercises = availableExercises.slice(start, start + exercisesPerDay);
    if (dayExercises.length === 0) break;
    weeks.push({
      day,
      exercises: dayExercises.map(ex => {
        const notes = limitations.length > 0 ? `Avoid if ${limitations.join(', ')}` : undefined;
        return {
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          ...(notes ? { notes } : {})
        };
      })
    });
  }

  return {
    programId: `prog-${templateId}-${Date.now()}`,
    weeks
  };
}

module.exports = { generateProgram };
