function filterExercises(library, params) {
  const ageMap = { child: 8, teen: 14, adult: 20, senior: 50 };
  const userAge = ageMap[params.ageGroup] || 0;
  const userMuscles = params.muscleGroups || [];
  const userEquipment = params.equipment || [];
  const userLevel = params.level || '';

  const levelOrder = ['beginner', 'intermediate', 'advanced'];
  const userLevelIndex = levelOrder.indexOf(userLevel);

  const results = [];

  for (const exercise of library) {
    const muscleMatch = userMuscles.length === 0 || exercise.muscles.some(m => userMuscles.includes(m));
    if (!muscleMatch) continue;

    const equipmentMatch = exercise.equipment.every(eq => userEquipment.includes(eq));
    if (!equipmentMatch) continue;

    const exerciseLevelIndex = levelOrder.indexOf(exercise.level);
    const levelMatch = exerciseLevelIndex <= userLevelIndex;
    if (!levelMatch) continue;

    const ageMatch = exercise.ageMin <= userAge;
    if (!ageMatch) continue;

    results.push({ exercise, score: 1 });
  }

  return results;
}

module.exports = { filterExercises };
