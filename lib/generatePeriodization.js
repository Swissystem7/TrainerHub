function generatePeriodization(basePlan, totalWeeks, goal) {
  if (totalWeeks === 0) return [];
  const result = [];
  for (let w = 0; w < totalWeeks; w++) {
    const weekPlan = basePlan.map(exercise => {
      let sets = exercise.sets;
      let repsRange = exercise.repsRange;
      let restSeconds = exercise.restSeconds;
      if (goal === 'strength' || goal === 'hypertrophy') {
        const repDecrease = Math.min(w, repsRange[1] - 1);
        repsRange = [Math.max(1, repsRange[0] - repDecrease), Math.max(1, repsRange[1] - repDecrease)];
        if (goal === 'strength') {
          restSeconds = Math.min(300, restSeconds + w * 10);
        } else {
          restSeconds = Math.min(120, restSeconds + w * 5);
        }
      } else if (goal === 'endurance') {
        sets = sets + w;
        restSeconds = Math.max(30, restSeconds - w * 5);
      }
      return { exerciseName: exercise.exerciseName, sets, repsRange, restSeconds };
    });
    result.push(weekPlan);
  }
  return result;
}
module.exports = { generatePeriodization };