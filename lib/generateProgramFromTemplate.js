function generateProgramFromTemplate(templateId, clientParams) {
  const { randomUUID } = require('crypto');
  const templates = {
    'template1': {
      name: 'Full Body Foundation',
      weeks: 4,
      maxDays: 5,
      workouts: [
        { day: 1, exercises: [{ exerciseName: 'Squat', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Bench Press', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Row', sets: 3, reps: '8-12', rest: 90 }] },
        { day: 2, exercises: [{ exerciseName: 'Deadlift', sets: 3, reps: '5-8', rest: 120 }, { exerciseName: 'Overhead Press', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Pull Up', sets: 3, reps: '6-10', rest: 90 }] },
        { day: 3, exercises: [{ exerciseName: 'Lunges', sets: 3, reps: '10-15', rest: 60 }, { exerciseName: 'Incline Bench', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Face Pull', sets: 3, reps: '12-15', rest: 60 }] },
        { day: 4, exercises: [{ exerciseName: 'Squat', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Bench Press', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Row', sets: 3, reps: '8-12', rest: 90 }] },
        { day: 5, exercises: [{ exerciseName: 'Deadlift', sets: 3, reps: '5-8', rest: 120 }, { exerciseName: 'Overhead Press', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Pull Up', sets: 3, reps: '6-10', rest: 90 }] }
      ]
    },
    'template2': {
      name: 'Upper Lower Split',
      weeks: 6,
      maxDays: 4,
      workouts: [
        { day: 1, exercises: [{ exerciseName: 'Bench Press', sets: 4, reps: '6-10', rest: 90 }, { exerciseName: 'Row', sets: 4, reps: '8-12', rest: 90 }, { exerciseName: 'Overhead Press', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Pull Up', sets: 3, reps: '6-10', rest: 90 }] },
        { day: 2, exercises: [{ exerciseName: 'Squat', sets: 4, reps: '6-10', rest: 120 }, { exerciseName: 'Romanian Deadlift', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Leg Press', sets: 3, reps: '10-15', rest: 90 }] },
        { day: 3, exercises: [{ exerciseName: 'Incline Bench', sets: 4, reps: '8-12', rest: 90 }, { exerciseName: 'Cable Row', sets: 4, reps: '10-15', rest: 60 }, { exerciseName: 'Lateral Raise', sets: 3, reps: '12-15', rest: 60 }, { exerciseName: 'Bicep Curl', sets: 3, reps: '10-15', rest: 60 }] },
        { day: 4, exercises: [{ exerciseName: 'Deadlift', sets: 3, reps: '5-8', rest: 120 }, { exerciseName: 'Front Squat', sets: 3, reps: '8-12', rest: 90 }, { exerciseName: 'Walking Lunge', sets: 3, reps: '10-12', rest: 60 }] }
      ]
    }
  };

  if (typeof templateId !== 'string' || templateId.trim() === '') {
    return { error: 'Invalid templateId' };
  }

  const template = templates[templateId];
  if (!template) {
    return { error: 'Template not found' };
  }

  if (!clientParams || typeof clientParams !== 'object' || Array.isArray(clientParams)) {
    return { error: 'Invalid client parameters' };
  }

  const validLevels = ['beginner', 'intermediate', 'advanced'];
  const validGoals = ['strength', 'hypertrophy', 'endurance', 'general'];

  if (!clientParams.experienceLevel || !validLevels.includes(clientParams.experienceLevel)) {
    return { error: 'Invalid client parameters' };
  }
  if (!clientParams.goal || !validGoals.includes(clientParams.goal)) {
    return { error: 'Invalid client parameters' };
  }
  if (typeof clientParams.daysPerWeek !== 'number' || clientParams.daysPerWeek < 1 || clientParams.daysPerWeek > 7 || !Number.isInteger(clientParams.daysPerWeek)) {
    return { error: 'Invalid client parameters' };
  }

  let warning = null;
  let selectedWorkouts = [];
  const maxDays = template.maxDays;

  if (clientParams.daysPerWeek > maxDays) {
    warning = `Requested ${clientParams.daysPerWeek} days per week exceeds template max of ${maxDays}. Repeating workouts to fill.`;
    const baseWorkouts = template.workouts;
    for (let i = 0; i < clientParams.daysPerWeek; i++) {
      const baseIndex = i % baseWorkouts.length;
      selectedWorkouts.push({
        day: i + 1,
        exercises: baseWorkouts[baseIndex].exercises.map(ex => ({ ...ex }))
      });
    }
  } else {
    selectedWorkouts = template.workouts.slice(0, clientParams.daysPerWeek).map((w, idx) => ({
      day: idx + 1,
      exercises: w.exercises.map(ex => ({ ...ex }))
    }));
  }

  const programId = `prog_${randomUUID()}`;
  const program = {
    programId: programId,
    name: template.name,
    weeks: template.weeks,
    workouts: selectedWorkouts
  };

  const result = { program: program, programId: programId };
  if (warning) {
    result.warning = warning;
  }
  return result;
}

module.exports = { generateProgramFromTemplate };
