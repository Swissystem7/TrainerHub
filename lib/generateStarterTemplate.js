function generateStarterTemplate(specialty, equipment, duration) {
  if (!['strength', 'hiit', 'yoga', 'crossfit'].includes(specialty)) {
    return { error: 'Unsupported specialty' };
  }
  if (!Array.isArray(equipment) || equipment.length === 0) {
    return { error: 'At least one equipment required' };
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: 'Duration must be positive' };
  }

  const exerciseDB = {
    strength: {
      barbell: [
        { name: 'Barbell Squat', sets: 4, reps: 8 },
        { name: 'Barbell Bench Press', sets: 4, reps: 8 },
        { name: 'Barbell Deadlift', sets: 3, reps: 6 },
        { name: 'Barbell Overhead Press', sets: 4, reps: 8 },
        { name: 'Barbell Row', sets: 4, reps: 8 }
      ],
      dumbbell: [
        { name: 'Dumbbell Squat', sets: 3, reps: 10 },
        { name: 'Dumbbell Bench Press', sets: 3, reps: 10 },
        { name: 'Dumbbell Lunges', sets: 3, reps: 12 },
        { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
        { name: 'Dumbbell Row', sets: 3, reps: 10 }
      ],
      kettlebell: [
        { name: 'Kettlebell Swing', sets: 3, reps: 15 },
        { name: 'Goblet Squat', sets: 3, reps: 12 },
        { name: 'Kettlebell Clean', sets: 3, reps: 10 },
        { name: 'Kettlebell Press', sets: 3, reps: 10 },
        { name: 'Turkish Get-Up', sets: 3, reps: 5 }
      ],
      bodyweight: [
        { name: 'Push-Up', sets: 3, reps: 15 },
        { name: 'Bodyweight Squat', sets: 3, reps: 20 },
        { name: 'Pull-Up', sets: 3, reps: 8 },
        { name: 'Plank', sets: 3, reps: 60 },
        { name: 'Lunge', sets: 3, reps: 12 }
      ]
    },
    hiit: {
      dumbbell: [
        { name: 'Dumbbell Thrusters', sets: 4, reps: 12 },
        { name: 'Dumbbell Burpees', sets: 4, reps: 10 },
        { name: 'Dumbbell Mountain Climbers', sets: 4, reps: 20 },
        { name: 'Dumbbell Jump Squats', sets: 4, reps: 15 },
        { name: 'Dumbbell High Knees', sets: 4, reps: 30 }
      ],
      kettlebell: [
        { name: 'Kettlebell Swings', sets: 4, reps: 20 },
        { name: 'Kettlebell Snatch', sets: 4, reps: 12 },
        { name: 'Kettlebell Burpees', sets: 4, reps: 10 },
        { name: 'Kettlebell Jump Squats', sets: 4, reps: 15 },
        { name: 'Kettlebell High Pulls', sets: 4, reps: 15 }
      ],
      bodyweight: [
        { name: 'Burpees', sets: 4, reps: 15 },
        { name: 'Mountain Climbers', sets: 4, reps: 30 },
        { name: 'Jump Squats', sets: 4, reps: 20 },
        { name: 'High Knees', sets: 4, reps: 40 },
        { name: 'Plank Jacks', sets: 4, reps: 20 }
      ],
      battleRope: [
        { name: 'Battle Rope Slams', sets: 4, reps: 20 },
        { name: 'Battle Rope Waves', sets: 4, reps: 30 },
        { name: 'Battle Rope Circles', sets: 4, reps: 15 },
        { name: 'Battle Rope Jumping Jacks', sets: 4, reps: 20 },
        { name: 'Battle Rope Alternating Waves', sets: 4, reps: 20 }
      ]
    },
    yoga: {
      mat: [
        { name: 'Downward Dog', sets: 3, reps: 10 },
        { name: 'Warrior I', sets: 3, reps: 8 },
        { name: 'Warrior II', sets: 3, reps: 8 },
        { name: 'Tree Pose', sets: 3, reps: 8 },
        { name: 'Child\'s Pose', sets: 3, reps: 10 }
      ],
      block: [
        { name: 'Triangle Pose', sets: 3, reps: 8 },
        { name: 'Half Moon', sets: 3, reps: 6 },
        { name: 'Extended Side Angle', sets: 3, reps: 8 },
        { name: 'Pyramid Pose', sets: 3, reps: 6 },
        { name: 'Revolved Triangle', sets: 3, reps: 6 }
      ],
      strap: [
        { name: 'Seated Forward Fold', sets: 3, reps: 10 },
        { name: 'Reclined Hand-to-Big-Toe', sets: 3, reps: 8 },
        { name: 'Cow Face Pose', sets: 3, reps: 6 },
        { name: 'Monkey Pose', sets: 3, reps: 6 },
        { name: 'Bound Angle Pose', sets: 3, reps: 10 }
      ],
      bodyweight: [
        { name: 'Sun Salutation A', sets: 3, reps: 5 },
        { name: 'Sun Salutation B', sets: 3, reps: 5 },
        { name: 'Cat-Cow', sets: 3, reps: 10 },
        { name: 'Bridge Pose', sets: 3, reps: 8 },
        { name: 'Corpse Pose', sets: 1, reps: 1 }
      ]
    },
    crossfit: {
      barbell: [
        { name: 'Clean and Jerk', sets: 5, reps: 3 },
        { name: 'Snatch', sets: 5, reps: 3 },
        { name: 'Front Squat', sets: 5, reps: 5 },
        { name: 'Push Press', sets: 5, reps: 5 },
        { name: 'Deadlift', sets: 5, reps: 5 }
      ],
      kettlebell: [
        { name: 'Kettlebell Swing', sets: 5, reps: 15 },
        { name: 'Turkish Get-Up', sets: 5, reps: 3 },
        { name: 'Kettlebell Clean', sets: 5, reps: 10 },
        { name: 'Kettlebell Snatch', sets: 5, reps: 10 },
        { name: 'Goblet Squat', sets: 5, reps: 10 }
      ],
      dumbbell: [
        { name: 'Dumbbell Thrusters', sets: 5, reps: 10 },
        { name: 'Dumbbell Snatch', sets: 5, reps: 8 },
        { name: 'Dumbbell Burpees', sets: 5, reps: 10 },
        { name: 'Dumbbell Box Step-Ups', sets: 5, reps: 10 },
        { name: 'Dumbbell Lunges', sets: 5, reps: 10 }
      ],
      bodyweight: [
        { name: 'Burpees', sets: 5, reps: 15 },
        { name: 'Pull-Ups', sets: 5, reps: 10 },
        { name: 'Push-Ups', sets: 5, reps: 20 },
        { name: 'Air Squats', sets: 5, reps: 20 },
        { name: 'Box Jumps', sets: 5, reps: 10 }
      ]
    }
  };

  const specialtyDB = exerciseDB[specialty];
  const availableExercises = [];
  const usedEquipment = new Set();

  for (const eq of equipment) {
    const eqLower = String(eq).toLowerCase().replace(/[^a-z]/g, '');
    const dbKey = Object.keys(specialtyDB).find(key => key.toLowerCase().replace(/[^a-z]/g, '') === eqLower);
    if (dbKey) {
      usedEquipment.add(eqLower);
      availableExercises.push(...specialtyDB[dbKey]);
    }
  }

  if (availableExercises.length === 0) {
    return { error: 'No suitable exercises found' };
  }

  const days = [];
  const exercisesPerDay = Math.min(5, Math.ceil(availableExercises.length / 3));
  const selected = [...availableExercises];

  for (let i = 0; i < 3; i++) {
    const dayExercises = [];
    for (let j = 0; j < exercisesPerDay; j++) {
      const idx = (i * exercisesPerDay + j) % selected.length;
      dayExercises.push({ ...selected[idx] });
    }
    days.push({
      name: `Day ${i + 1}`,
      exercises: dayExercises
    });
  }

  const { randomUUID } = require('crypto');
  const templateId = `tmpl-${specialty}-${randomUUID()}`;
  const name = `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Starter (${duration} min)`;

  return { templateId, name, days };
}

module.exports = { generateStarterTemplate };
