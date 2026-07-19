function generateBaselineProgram(prefs) {
  const { randomUUID } = require('crypto');
  if (!prefs || typeof prefs !== 'object') throw new TypeError('prefs required');
  const validStyles = ['Strength','Hypertrophy','Endurance','General'];
  const validGoals = ['Muscle gain','Fat loss','Maintenance'];
  let style = prefs.style;
  let daysPerWeek = prefs.daysPerWeek;
  let durationWeeks = prefs.durationWeeks;
  let equipment = prefs.equipment;
  let goal = prefs.goal;

  if (!validStyles.includes(style)) style = 'General';
  if (!validGoals.includes(goal)) goal = 'Maintenance';
  if (typeof daysPerWeek !== 'number' || daysPerWeek < 1 || daysPerWeek > 7) daysPerWeek = 3;
  if (typeof durationWeeks !== 'number' || durationWeeks < 1 || durationWeeks > 12) durationWeeks = 4;
  if (!equipment || !Array.isArray(equipment) || equipment.length === 0) equipment = ['bodyweight'];

  if ((style === 'Endurance' && goal === 'Muscle gain') || (style === 'Strength' && goal === 'Fat loss' && daysPerWeek > 5)) {
    style = 'General';
    goal = 'Maintenance';
  }

  const exerciseLibrary = {
    Strength: {
      barbell: ['Barbell Squat', 'Barbell Bench Press', 'Barbell Deadlift', 'Barbell Overhead Press', 'Barbell Row'],
      dumbbell: ['Dumbbell Squat', 'Dumbbell Bench Press', 'Dumbbell Deadlift', 'Dumbbell Shoulder Press', 'Dumbbell Row'],
      kettlebell: ['Kettlebell Swing', 'Kettlebell Goblet Squat', 'Kettlebell Clean and Press', 'Kettlebell Snatch', 'Kettlebell Turkish Get-Up'],
      bodyweight: ['Push-Up', 'Pull-Up', 'Bodyweight Squat', 'Diamond Push-Up', 'Pike Push-Up'],
      machine: ['Leg Press', 'Chest Press Machine', 'Lat Pulldown', 'Seated Row Machine', 'Shoulder Press Machine'],
      cable: ['Cable Chest Fly', 'Cable Row', 'Cable Lateral Raise', 'Cable Tricep Pushdown', 'Cable Bicep Curl'],
      band: ['Band Squat', 'Band Chest Press', 'Band Row', 'Band Overhead Press', 'Band Pull-Apart']
    },
    Hypertrophy: {
      barbell: ['Barbell Bicep Curl', 'Barbell Skull Crusher', 'Barbell Hip Thrust', 'Barbell Glute Bridge', 'Barbell Front Squat'],
      dumbbell: ['Dumbbell Lateral Raise', 'Dumbbell Hammer Curl', 'Dumbbell Tricep Extension', 'Dumbbell Lunges', 'Dumbbell Calf Raise'],
      kettlebell: ['Kettlebell Single Leg Deadlift', 'Kettlebell Windmill', 'Kettlebell Figure 8', 'Kettlebell Halo', 'Kettlebell Row'],
      bodyweight: ['Bulgarian Split Squat', 'Archer Push-Up', 'Pistol Squat', 'Chin-Up', 'Dips'],
      machine: ['Leg Curl Machine', 'Leg Extension Machine', 'Tricep Pushdown Machine', 'Bicep Curl Machine', 'Chest Fly Machine'],
      cable: ['Cable Face Pull', 'Cable Pull-Through', 'Cable Woodchop', 'Cable Kickback', 'Cable Crunch'],
      band: ['Band Bicep Curl', 'Band Tricep Extension', 'Band Lateral Walk', 'Band Glute Bridge', 'Band Pull-Through']
    },
    Endurance: {
      barbell: ['Barbell Clean and Press (light)', 'Barbell Thrusters', 'Barbell Snatch (light)', 'Barbell Good Morning', 'Barbell Romanian Deadlift'],
      dumbbell: ['Dumbbell Snatch', 'Dumbbell Clean', 'Dumbbell Thruster', 'Dumbbell Swing', 'Dumbbell Burpee'],
      kettlebell: ['Kettlebell Snatch', 'Kettlebell Clean', 'Kettlebell Jerk', 'Kettlebell Long Cycle', 'Kettlebell Swing (high rep)'],
      bodyweight: ['Burpee', 'Mountain Climber', 'Jumping Jack', 'High Knees', 'Plank Jack'],
      machine: ['Rowing Machine', 'Assault Bike', 'Treadmill', 'Stair Climber', 'Ski Erg'],
      cable: ['Cable Chop (high rep)', 'Cable Pull (high rep)', 'Cable Rotation', 'Cable Punch', 'Cable Side Bend'],
      band: ['Band Jump Squat', 'Band Speed Deadlift', 'Band Press (high rep)', 'Band Row (high rep)', 'Band Pull-Apart (high rep)']
    },
    General: {
      barbell: ['Barbell Squat', 'Barbell Bench Press', 'Barbell Deadlift', 'Barbell Overhead Press', 'Barbell Row'],
      dumbbell: ['Dumbbell Squat', 'Dumbbell Bench Press', 'Dumbbell Deadlift', 'Dumbbell Shoulder Press', 'Dumbbell Row'],
      kettlebell: ['Kettlebell Swing', 'Kettlebell Goblet Squat', 'Kettlebell Clean and Press', 'Kettlebell Snatch', 'Kettlebell Turkish Get-Up'],
      bodyweight: ['Push-Up', 'Pull-Up', 'Bodyweight Squat', 'Lunges', 'Plank'],
      machine: ['Leg Press', 'Chest Press Machine', 'Lat Pulldown', 'Seated Row Machine', 'Shoulder Press Machine'],
      cable: ['Cable Chest Fly', 'Cable Row', 'Cable Lateral Raise', 'Cable Tricep Pushdown', 'Cable Bicep Curl'],
      band: ['Band Squat', 'Band Chest Press', 'Band Row', 'Band Overhead Press', 'Band Pull-Apart']
    }
  };

  const repSchemes = {
    Strength: { sets: 4, reps: 6, notes: 'Focus on heavy loads, rest 2-3 min' },
    Hypertrophy: { sets: 3, reps: 10, notes: 'Moderate weight, rest 60-90 sec' },
    Endurance: { sets: 3, reps: 15, notes: 'Light weight, rest 30-45 sec' },
    General: { sets: 3, reps: 8, notes: 'Balanced approach, rest 60 sec' }
  };

  const selectedStyle = style;
  const repScheme = repSchemes[selectedStyle];
  const equipmentType = equipment.includes('barbell') ? 'barbell' :
                        equipment.includes('dumbbell') ? 'dumbbell' :
                        equipment.includes('kettlebell') ? 'kettlebell' :
                        equipment.includes('machine') ? 'machine' :
                        equipment.includes('cable') ? 'cable' :
                        equipment.includes('band') ? 'band' : 'bodyweight';

  const exercises = exerciseLibrary[selectedStyle][equipmentType] || exerciseLibrary[selectedStyle]['bodyweight'];

  const weeks = [];
  for (let w = 1; w <= durationWeeks; w++) {
    const days = [];
    for (let d = 1; d <= daysPerWeek; d++) {
      const dayExercises = [];
      const numExercises = Math.min(5, exercises.length);
      for (let e = 0; e < numExercises; e++) {
        const exerciseIndex = (d - 1 + e) % exercises.length;
        dayExercises.push({
          name: exercises[exerciseIndex],
          sets: repScheme.sets,
          reps: repScheme.reps,
          notes: repScheme.notes
        });
      }
      days.push({ day: d, exercises: dayExercises });
    }
    weeks.push({ weekNumber: w, days: days });
  }

  const programId = randomUUID();

  return {
    programId: programId,
    weeks: weeks
  };
}

module.exports = { generateBaselineProgram };
