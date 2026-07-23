function detectAnomalousProgressEntry(entry, clientHistory, workoutPlan) {
  const reasons = [];
  let riskScore = 0;
  const serverTime = Date.now();

  if (entry.weight <= 0) {
    reasons.push('Invalid weight');
    riskScore += 40;
  }

  if (entry.reps < 1) {
    reasons.push('Invalid reps');
    riskScore += 30;
  }

  if (serverTime - entry.timestamp > 48 * 60 * 60 * 1000) {
    reasons.push('Stale entry');
    riskScore += 10;
  }

  const hour = new Date(entry.timestamp).getHours();
  if (hour < 9 || hour >= 18) {
    reasons.push('Timestamp outside session hours (9-18)');
    riskScore += 10;
  }

  if (workoutPlan && workoutPlan.exercises) {
    const planExercise = workoutPlan.exercises.find(e => e.exerciseId === entry.exerciseId);
    if (!planExercise) {
      reasons.push('Exercise not in plan');
      riskScore += 20;
    } else {
      if (entry.reps > planExercise.expectedReps * 2) {
        reasons.push('Reps > 2x planned');
        riskScore += 30;
      }
      if (entry.weight > planExercise.expectedWeight * 3) {
        reasons.push('Weight > 3x planned');
        riskScore += 40;
      }
    }
  }

  if (clientHistory && clientHistory.length > 0) {
    const sameExerciseHistory = clientHistory.filter(e => e.exerciseId === entry.exerciseId);
    if (sameExerciseHistory.length > 0) {
      const avgWeight = sameExerciseHistory.reduce((sum, e) => sum + e.weight, 0) / sameExerciseHistory.length;
      if (entry.weight > avgWeight * 3) {
        reasons.push('Weight > 3x historical average');
        riskScore += 40;
      }
      const avgReps = sameExerciseHistory.reduce((sum, e) => sum + e.reps, 0) / sameExerciseHistory.length;
      if (entry.reps > avgReps * 2) {
        reasons.push('Reps > 2x historical average');
        riskScore += 30;
      }
    }

    const duplicate = clientHistory.some(e =>
      e.exerciseId === entry.exerciseId &&
      e.weight === entry.weight &&
      e.reps === entry.reps &&
      Math.abs(e.timestamp - entry.timestamp) < 60000 &&
      e.sessionId !== entry.sessionId
    );
    if (duplicate) {
      reasons.push('Duplicate entry');
      riskScore += 20;
    }
  }

  riskScore = Math.min(riskScore, 100);
  const anomaly = riskScore > 0;
  return { anomaly, reasons, riskScore };
}

module.exports = { detectAnomalousProgressEntry };
