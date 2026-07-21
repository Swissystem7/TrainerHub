function calculateClientChurnRisk(clientId, workoutHistory, paymentHistory, lastInteractionDate) {
  if (typeof clientId !== 'string' || !Array.isArray(workoutHistory) || !Array.isArray(paymentHistory) || typeof lastInteractionDate !== 'string') {
    throw new TypeError("Invalid input types");
  }
  const now = new Date();
  const lastInteraction = new Date(lastInteractionDate);
  if (isNaN(lastInteraction.getTime())) throw new TypeError("Invalid lastInteractionDate");
  const effectiveLastInteraction = lastInteraction > now ? now : lastInteraction;

  const factors = [];
  let riskScore = 0;

  const workoutDates = new Set();
  const completedWorkouts = [];
  const totalWorkouts = [];
  for (const w of workoutHistory) {
    if (w === null || w === undefined || typeof w.date !== 'string' || typeof w.completed !== 'boolean') {
      throw new TypeError("Invalid workout entry");
    }
    const d = new Date(w.date);
    if (isNaN(d.getTime())) throw new TypeError("Invalid workout date");
    const effectiveDate = d > now ? now : d;
    const key = `${d.toISOString()}|${w.completed}`;
    if (!workoutDates.has(key)) {
      workoutDates.add(key);
      totalWorkouts.push(effectiveDate);
      if (w.completed) completedWorkouts.push(effectiveDate);
    }
  }

  const paymentDates = new Set();
  let overdueCount = 0;
  let failedCount = 0;
  let totalPayments = 0;
  for (const p of paymentHistory) {
    if (p === null || p === undefined || typeof p.date !== 'string' || !Number.isFinite(p.amount) || !['paid','overdue','failed'].includes(p.status)) {
      throw new TypeError("Invalid payment entry");
    }
    const d = new Date(p.date);
    if (isNaN(d.getTime())) throw new TypeError("Invalid payment date");
    const effectiveDate = d > now ? now : d;
    const key = `${d.toISOString()}|${p.amount}|${p.status}`;
    if (!paymentDates.has(key)) {
      paymentDates.add(key);
      totalPayments++;
      if (p.status === 'overdue') overdueCount++;
      if (p.status === 'failed') failedCount++;
    }
  }

  if (totalWorkouts.length === 0 && totalPayments === 0) {
    return { riskScore: 0, riskLevel: 'low', factors: [] };
  }

  if (totalWorkouts.length > 0) {
    const completionRate = completedWorkouts.length / totalWorkouts.length;
    if (completionRate < 0.5) {
      riskScore += 30;
      factors.push("Low workout completion rate");
    } else if (completionRate < 0.8) {
      riskScore += 15;
      factors.push("Moderate workout completion rate");
    }
    const sortedWorkouts = [...completedWorkouts].sort((a,b)=>b-a);
    if (sortedWorkouts.length > 0) {
      const daysSinceLastWorkout = Math.floor((now - sortedWorkouts[0]) / (1000*60*60*24));
      if (daysSinceLastWorkout > 30) {
        riskScore += 25;
        factors.push("No recent completed workouts (over 30 days)");
      } else if (daysSinceLastWorkout > 14) {
        riskScore += 10;
        factors.push("No recent completed workouts (over 14 days)");
      }
    } else {
      riskScore += 25;
      factors.push("No completed workouts ever");
    }
  }

  if (totalPayments > 0) {
    if (overdueCount > 0) {
      riskScore += 20;
      factors.push("Overdue payments");
    }
    if (failedCount > 0) {
      riskScore += 25;
      factors.push("Failed payments");
    }
    const sortedPayments = [...paymentHistory].filter(p => p.status === 'paid').sort((a,b)=>new Date(b.date)-new Date(a.date));
    if (sortedPayments.length > 0) {
      const lastPaid = new Date(sortedPayments[0].date);
      const effectiveLastPaid = lastPaid > now ? now : lastPaid;
      const daysSinceLastPayment = Math.floor((now - effectiveLastPaid) / (1000*60*60*24));
      if (daysSinceLastPayment > 60) {
        riskScore += 15;
        factors.push("No recent payment (over 60 days)");
      }
    } else {
      riskScore += 15;
      factors.push("No successful payments");
    }
  }

  const daysSinceLastInteraction = Math.floor((now - effectiveLastInteraction) / (1000*60*60*24));
  if (daysSinceLastInteraction > 30) {
    riskScore += 20;
    factors.push("No recent interaction (over 30 days)");
  } else if (daysSinceLastInteraction > 14) {
    riskScore += 10;
    factors.push("No recent interaction (over 14 days)");
  }

  riskScore = Math.max(0, Math.min(100, riskScore));
  let riskLevel;
  if (riskScore < 30) riskLevel = 'low';
  else if (riskScore < 60) riskLevel = 'medium';
  else riskLevel = 'high';

  return { riskScore, riskLevel, factors };
}

module.exports = { calculateClientChurnRisk };
