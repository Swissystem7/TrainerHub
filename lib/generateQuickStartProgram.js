function generateQuickStartProgram(clientProfile) {
  clientProfile = clientProfile && typeof clientProfile === 'object' ? clientProfile : {};
  const age = Number.isFinite(clientProfile.age) ? Math.min(100, Math.max(10, clientProfile.age)) : 30;
  const goals = Array.isArray(clientProfile.goals) && clientProfile.goals.length > 0 ? clientProfile.goals.map(g => {
    const valid = ['strength', 'hypertrophy', 'endurance', 'general fitness', 'weight loss'];
    return typeof g === 'string' && valid.includes(g.toLowerCase()) ? g.toLowerCase() : 'general fitness';
  }) : ['general fitness'];
  const experienceLevel = ['beginner', 'intermediate', 'advanced'].includes(clientProfile.experienceLevel) ? clientProfile.experienceLevel : 'beginner';
  let equipment = Array.isArray(clientProfile.equipment) && clientProfile.equipment.length > 0 ? clientProfile.equipment.filter(e => typeof e === 'string').map(e => e.toLowerCase()) : ['bodyweight'];
  if (equipment.length === 0) equipment = ['bodyweight'];
  if (equipment.includes('none')) equipment = ['bodyweight'];
  
  const daysPerWeek = { beginner: 3, intermediate: 4, advanced: 5 }[experienceLevel];
  
  const exerciseDB = {
    'beginner': {
      'general fitness': {
        'bodyweight': [
          { name: 'bodyweight squats', sets: 3, reps: '12-15', restSeconds: 60 },
          { name: 'push-ups', sets: 3, reps: '8-12', restSeconds: 60 },
          { name: 'plank', sets: 3, reps: '30 sec', restSeconds: 45 }
        ],
        'dumbbell': [
          { name: 'goblet squats', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'dumbbell rows', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'dumbbell press', sets: 3, reps: '8-10', restSeconds: 60 }
        ],
        'barbell': [
          { name: 'barbell squats', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'barbell rows', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'bench press', sets: 3, reps: '8-10', restSeconds: 90 }
        ]
      },
      'strength': {
        'bodyweight': [
          { name: 'lunges', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'diamond push-ups', sets: 3, reps: '6-10', restSeconds: 60 },
          { name: 'glute bridges', sets: 3, reps: '12-15', restSeconds: 45 }
        ],
        'dumbbell': [
          { name: 'dumbbell squats', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'dumbbell deadlifts', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'dumbbell bench press', sets: 3, reps: '8-10', restSeconds: 90 }
        ],
        'barbell': [
          { name: 'squat', sets: 4, reps: '6-8', restSeconds: 120 },
          { name: 'bench press', sets: 4, reps: '6-8', restSeconds: 120 },
          { name: 'deadlift', sets: 3, reps: '5', restSeconds: 150 }
        ]
      },
      'hypertrophy': {
        'bodyweight': [
          { name: 'squat jumps', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'push-ups', sets: 4, reps: '10-15', restSeconds: 45 },
          { name: 'dips (chair)', sets: 3, reps: '8-12', restSeconds: 45 }
        ],
        'dumbbell': [
          { name: 'dumbbell curls', sets: 3, reps: '10-12', restSeconds: 45 },
          { name: 'dumbbell tricep extensions', sets: 3, reps: '10-12', restSeconds: 45 },
          { name: 'dumbbell lateral raises', sets: 3, reps: '12-15', restSeconds: 45 }
        ],
        'barbell': [
          { name: 'barbell curls', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'close-grip bench press', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'overhead press', sets: 3, reps: '8-10', restSeconds: 60 }
        ]
      },
      'endurance': {
        'bodyweight': [
          { name: 'jumping jacks', sets: 3, reps: '30 sec', restSeconds: 30 },
          { name: 'mountain climbers', sets: 3, reps: '30 sec', restSeconds: 30 },
          { name: 'burpees', sets: 3, reps: '10-12', restSeconds: 30 }
        ],
        'dumbbell': [
          { name: 'dumbbell thrusters', sets: 3, reps: '12-15', restSeconds: 30 },
          { name: 'dumbbell swings', sets: 3, reps: '15-20', restSeconds: 30 },
          { name: 'dumbbell snatches', sets: 3, reps: '10-12', restSeconds: 30 }
        ],
        'barbell': [
          { name: 'barbell clean and press', sets: 3, reps: '8-10', restSeconds: 45 },
          { name: 'barbell front squats', sets: 3, reps: '10-12', restSeconds: 45 },
          { name: 'barbell lunges', sets: 3, reps: '10-12', restSeconds: 45 }
        ]
      },
      'weight loss': {
        'bodyweight': [
          { name: 'high knees', sets: 3, reps: '30 sec', restSeconds: 30 },
          { name: 'burpees', sets: 3, reps: '10-12', restSeconds: 30 },
          { name: 'plank jacks', sets: 3, reps: '30 sec', restSeconds: 30 }
        ],
        'dumbbell': [
          { name: 'dumbbell thrusters', sets: 3, reps: '12-15', restSeconds: 30 },
          { name: 'dumbbell swings', sets: 3, reps: '15-20', restSeconds: 30 },
          { name: 'dumbbell box step-ups', sets: 3, reps: '10-12', restSeconds: 30 }
        ],
        'barbell': [
          { name: 'barbell clean and press', sets: 3, reps: '8-10', restSeconds: 45 },
          { name: 'barbell thrusters', sets: 3, reps: '10-12', restSeconds: 45 },
          { name: 'barbell burpees', sets: 3, reps: '8-10', restSeconds: 45 }
        ]
      }
    },
    'intermediate': {
      'general fitness': {
        'bodyweight': [
          { name: 'pistol squats', sets: 3, reps: '6-8', restSeconds: 60 },
          { name: 'archer push-ups', sets: 3, reps: '6-8', restSeconds: 60 },
          { name: 'hollow body hold', sets: 3, reps: '45 sec', restSeconds: 45 }
        ],
        'dumbbell': [
          { name: 'dumbbell lunges', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'dumbbell rows', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'dumbbell shoulder press', sets: 3, reps: '8-10', restSeconds: 60 }
        ],
        'barbell': [
          { name: 'barbell squats', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'barbell rows', sets: 3, reps: '8-10', restSeconds: 90 },
          { name: 'bench press', sets: 3, reps: '8-10', restSeconds: 90 }
        ]
      },
      'strength': {
        'bodyweight': [
          { name: 'single-leg squats', sets: 3, reps: '8-10', restSeconds: 60 },
          { name: 'pike push-ups', sets: 3, reps: '6-8', restSeconds: 60 },
          { name: 'pull-ups (if available)', sets: 3, reps: '5-8', restSeconds: 90 }
        ],
        'dumbbell': [
          { name: 'dumbbell squats', sets: 4, reps: '6-8', restSeconds: 90 },
          { name: 'dumbbell deadlifts', sets: 4, reps: '6-8', restSeconds: 90 },
          { name: 'dumbbell bench press', sets: 4, reps: '6-8', restSeconds: 90 }
        ],
        'barbell': [
          { name: 'squat', sets: 4, reps: '5-6', restSeconds: 150 },
          { name: 'bench press', sets: 4, reps: '5-6', restSeconds: 150 },
          { name: 'deadlift', sets: 4, reps: '5', restSeconds: 180 }
        ]
      },
      'hypertrophy': {
        'bodyweight': [
          { name: 'bulgarian split squats', sets: 3, reps: '10-12', restSeconds: 60 },
          { name: 'decline push-ups', sets: 4, reps: '10-12', restSeconds: 45 },
          { name: 'dips', sets: 3, reps: '8-12', restSeconds: 45 }
        ],
        'dumbbell': [
          { name: 'dumbbell curls', sets: 4, reps: '10-12', restSeconds: 45 },
          { name: 'dumbbell tricep extensions', sets: 4, reps: '10-12', restSeconds: 45 },
          { name: 'dumbbell lateral raises', sets: 4, reps: '12-15', restSeconds: 45 }
        ],
        'barbell': [
          { name: 'barbell curls', sets: 4, reps: '8-10', restSeconds: 60 },
          { name: 'close-grip bench press', sets: 4, reps: '8-10', restSeconds: 60 },
          { name: 'overhead press', sets: 4, reps: '8-10', restSeconds: 60 }
        ]
      },
      'endurance': {
        'bodyweight': [
          { name: 'burpee broad jumps', sets: 3, reps: '10-12', restSeconds: 30 },
          { name: 'mountain climbers', sets: 4, reps: '45 sec', restSeconds: 30 },
          { name: 'tuck jumps', sets: 3, reps: '10-12', restSeconds: 30 }
        ],
        'dumbbell': [
          { name: 'dumbbell thrusters', sets: 4, reps: '12-15', restSeconds: 30 },
          { name: 'dumbbell swings', sets: 4, reps: '15-20', restSeconds: 30 },
          { name: 'dumbbell snatches', sets: 4, reps: '10-12', restSeconds: 30 }
        ],
        'barbell': [
          { name: 'barbell clean and press', sets: 4, reps: '8-10', restSeconds: 45 },
          { name: 'barbell front squats', sets: 4, reps: '10-12', restSeconds: 45 },
          { name: 'barbell lunges', sets: 4, reps: '10-12', restSeconds: 45 }
        ]
      },
      'weight loss': {
        'bodyweight': [
          { name: 'burpee tuck jumps', sets: 4, reps: '10-12', restSeconds: 30 },
          { name: 'mountain climbers', sets: 4, reps: '45 sec', restSeconds: 30 },
          { name: 'plank jacks', sets: 4, reps: '45 sec', restSeconds: 30 }
        ],
        'dumbbell': [
          { name: 'dumbbell thrusters', sets: 4, reps: '12-15', restSeconds: 30 },
          { name: 'dumbbell swings', sets: 4, reps: '15-20', restSeconds: 30 },
          { name: 'dumbbell box step-ups', sets: 4, reps: '10-12', restSeconds: 30 }
        ],
        'barbell': [
          { name: 'barbell clean and press', sets: 4, reps: '8-10', restSeconds: 45 },
          { name: 'barbell thrusters', sets: 4, reps: '10-12', restSeconds: 45 },
          { name: 'barbell burpees', sets: 4, reps: '8-10', restSeconds: 45 }
        ]
      }
    },
    'advanced': {
      'general fitness': {
        'bodyweight': [
          { name: 'pistol squats', sets: 4, reps: '6-8', restSeconds: 60 },
          { name: 'handstand push-ups', sets: 3, reps: '5-8', restSeconds: 90 },
          { name: 'muscle-ups (if available)', sets: 3, reps: '3-5', restSeconds: 120 }
        ],
        'dumbbell': [
          { name: 'dumbbell lunges', sets: 4, reps: '10-12', restSeconds: 60 },
          { name: 'dumbbell rows', sets: 4, reps: '10-12', restSeconds: 60 },
          { name: 'dumbbell shoulder press', sets: 4, reps: '8-10', restSeconds: 60 }
        ],
        'barbell': [
          { name: 'barbell squats', sets: 4, reps: '8-10', restSeconds: 90 },
          { name: 'barbell rows', sets: 4, reps: '8-10', restSeconds: 90 },
          { name: 'bench press', sets: 4, reps: '8-10', restSeconds: 90 }
        ]
      },
      'strength': {
        'bodyweight': [
          { name: 'single-leg squats', sets: 4, reps: '8-10', restSeconds: 60 },
          { name: 'pike push-ups', sets: 4, reps: '6-8', restSeconds: 60 },
          { name: 'pull-ups', sets: 4, reps: '5-8', restSeconds: 90 }
        ],
        'dumbbell': [
          { name: 'dumbbell squats', sets: 5, reps: '5-6', restSeconds: 120 },
          { name: 'dumbbell deadlifts', sets: 5, reps: '5-6', restSeconds: 120 },
          { name: 'dumbbell bench press', sets: 5, reps: '5-6', restSeconds: 120 }
        ],
        'barbell': [
          { name: 'squat', sets: 5, reps: '3-5', restSeconds: 180 },
          { name: 'bench press', sets: 5, reps: '3-5', restSeconds: 180 },
          { name: 'deadlift', sets: 5, reps: '3-5', restSeconds: 210 }
        ]
      },
      'hypertrophy': {
        'bodyweight': [
          { name: 'bulgarian split squats', sets: 4, reps: '10-12', restSeconds: 60 },
          { name: 'decline push-ups', sets: 5, reps: '10-12', restSeconds: 45 },
          { name: 'dips', sets: 4, reps: '8-12', restSeconds: 45 }
        ],
        'dumbbell': [
          { name: 'dumbbell curls', sets: 5, reps: '10-12', restSeconds: 45 },
          { name: 'dumbbell tricep extensions', sets: 5, reps: '10-12', restSeconds: 45 },
          { name: 'dumbbell lateral raises', sets: 5, reps: '12-15', restSeconds: 45 }
        ],
        'barbell': [
          { name: 'barbell curls', sets: 5, reps: '8-10', restSeconds: 60 },
          { name: 'close-grip bench press', sets: 5, reps: '8-10', restSeconds: 60 },
          { name: 'overhead press', sets: 5, reps: '8-10', restSeconds: 60 }
        ]
      },
      'endurance': {
        'bodyweight': [
          { name: 'burpee broad jumps', sets: 4, reps: '10-12', restSeconds: 30 },
          { name: 'mountain climbers', sets: 5, reps: '45 sec', restSeconds: 30 },
          { name: 'tuck jumps', sets: 4, reps: '10-12', restSeconds: 30 }
        ],
        'dumbbell': [
          { name: 'dumbbell thrusters', sets: 5, reps: '12-15', restSeconds: 30 },
          { name: 'dumbbell swings', sets: 5, reps: '15-20', restSeconds: 30 },
          { name: 'dumbbell snatches', sets: 5, reps: '10-12', restSeconds: 30 }
        ],
        'barbell': [
          { name: 'barbell clean and press', sets: 5, reps: '8-10', restSeconds: 45 },
          { name: 'barbell front squats', sets: 5, reps: '10-12', restSeconds: 45 },
          { name: 'barbell lunges', sets: 5, reps: '10-12', restSeconds: 45 }
        ]
      },
      'weight loss': {
        'bodyweight': [
          { name: 'burpee tuck jumps', sets: 5, reps: '10-12', restSeconds: 30 },
          { name: 'mountain climbers', sets: 5, reps: '45 sec', restSeconds: 30 },
          { name: 'plank jacks', sets: 5, reps: '45 sec', restSeconds: 30 }
        ],
        'dumbbell': [
          { name: 'dumbbell thrusters', sets: 5, reps: '12-15', restSeconds: 30 },
          { name: 'dumbbell swings', sets: 5, reps: '15-20', restSeconds: 30 },
          { name: 'dumbbell box step-ups', sets: 5, reps: '10-12', restSeconds: 30 }
        ],
        'barbell': [
          { name: 'barbell clean and press', sets: 5, reps: '8-10', restSeconds: 45 },
          { name: 'barbell thrusters', sets: 5, reps: '10-12', restSeconds: 45 },
          { name: 'barbell burpees', sets: 5, reps: '8-10', restSeconds: 45 }
        ]
      }
    }
  };

  const primaryGoal = goals[0];
  let equipmentKey = 'bodyweight';
  if (equipment.includes('barbell')) equipmentKey = 'barbell';
  else if (equipment.includes('dumbbell')) equipmentKey = 'dumbbell';
  
  const levelData = exerciseDB[experienceLevel];
  const goalData = levelData[primaryGoal];
  const exercises = goalData[equipmentKey] || goalData['bodyweight'];
  
  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const days = [];
    for (let d = 0; d < daysPerWeek; d++) {
      days.push({ exercises: exercises.map(ex => ({ ...ex })) });
    }
    weeks.push({ days });
  }
  
  return { program: { weeks } };
}

module.exports = { generateQuickStartProgram };
