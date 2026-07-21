function generateProgressSummary(clientId, dateRange) {
  if (typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('Client not found');
  }
  if (!dateRange || typeof dateRange !== 'object') throw new Error('Invalid date range');
  const { start, end } = dateRange;
  if (!start || !end) {
    throw new Error('Invalid date range');
  }
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!validDate(start) || !validDate(end)) {
    throw new Error('Invalid date format');
  }
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T23:59:59.999Z`);
  if (startDate > endDate) {
    throw new Error('start must be <= end');
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const cappedEnd = endDate > today ? today : endDate;
  const clients = {
    'client-1': {
      workouts: [
        { date: '2025-03-01', exercises: [{ name: 'Squat', weight: 200, reps: 5 }], attended: true },
        { date: '2025-03-08', exercises: [{ name: 'Squat', weight: 205, reps: 5 }], attended: true },
        { date: '2025-03-15', exercises: [{ name: 'Bench press', weight: 150, reps: 5 }], attended: true },
        { date: '2025-03-22', exercises: [{ name: 'Deadlift', weight: 300, reps: 3 }], attended: true },
        { date: '2025-03-29', exercises: [{ name: 'Squat', weight: 210, reps: 5 }], attended: true },
      ],
      scheduledSessions: 5,
      weightHistory: [{ date: '2025-03-01', weight: 180 }, { date: '2025-03-29', weight: 178 }],
    },
    'client-2': {
      workouts: [],
      scheduledSessions: 0,
      weightHistory: [],
    },
  };
  const client = (globalThis.__progressClients || clients)[clientId];
  if (!client) {
    throw new Error('Client not found');
  }
  const filteredWorkouts = client.workouts.filter(w => {
    const wDate = new Date(w.date);
    return wDate >= startDate && wDate <= cappedEnd;
  });
  if (filteredWorkouts.length === 0) {
    return { summary: 'No data found for this period.', highlights: null };
  }
  const attendedCount = filteredWorkouts.filter(w => w.attended).length;
  const scheduledCount = filteredWorkouts.length;
  const consistencyScore = scheduledCount > 0 ? Math.min(100, Math.round((attendedCount / scheduledCount) * 100)) : 0;
  let newPR = null;
  let bestImprovement = 0;
  const prMap = {};
  for (const w of filteredWorkouts) {
    for (const ex of w.exercises) {
      const key = ex.name;
      if (!prMap[key] || ex.weight > prMap[key].weight) {
        prMap[key] = { weight: ex.weight, reps: ex.reps };
      }
    }
  }
  const allPRs = Object.entries(prMap);
  if (allPRs.length > 0) {
    for (const [name, pr] of allPRs) {
      const prevWorkouts = client.workouts.filter(w => new Date(w.date) < startDate);
      let prevMax = 0;
      for (const pw of prevWorkouts) {
        for (const pe of pw.exercises) {
          if (pe.name === name && pe.weight > prevMax) {
            prevMax = pe.weight;
          }
        }
      }
      if (prevMax > 0) {
        const improvement = ((pr.weight - prevMax) / prevMax) * 100;
        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          newPR = `${name} ${pr.weight} lbs`;
        }
      } else {
        if (bestImprovement === 0) {
          newPR = `${name} ${pr.weight} lbs`;
        }
      }
    }
  }
  let streak = 0;
  if (filteredWorkouts.length >= 3) {
    const weeks = {};
    for (const w of filteredWorkouts) {
      const d = new Date(w.date);
      const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + (d.getDay() + 1)) / 7)}`;
      if (!weeks[weekKey]) weeks[weekKey] = 0;
      weeks[weekKey]++;
    }
    const weekKeys = Object.keys(weeks).sort();
    let currentStreak = 0;
    for (const wk of weekKeys) {
      if (weeks[wk] >= 3) {
        currentStreak++;
        streak = Math.max(streak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
  }
  let weightChange = null;
  if (client.weightHistory.length >= 2) {
    const sortedWeights = client.weightHistory.filter(w => new Date(w.date) >= startDate && new Date(w.date) <= cappedEnd)
      .slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sortedWeights.length >= 2) {
      const firstWeight = sortedWeights[0].weight;
      const lastWeight = sortedWeights[sortedWeights.length - 1].weight;
      weightChange = parseFloat((lastWeight - firstWeight).toFixed(1));
    }
  }
  const highlights = {};
  if (newPR) highlights.newPR = newPR;
  if (streak > 0) highlights.streak = streak;
  highlights.consistencyScore = consistencyScore;
  if (weightChange !== null) highlights.weightChange = weightChange;
  let summary = '';
  if (newPR && streak > 0) {
    summary = `Great work this period! You hit a new ${newPR} and maintained a ${streak}-week streak. Consistency score: ${consistencyScore}%. Keep it up!`;
  } else if (newPR) {
    summary = `Nice progress! You achieved a new ${newPR}. Consistency score: ${consistencyScore}%. Keep pushing!`;
  } else if (streak > 0) {
    summary = `Solid effort! You maintained a ${streak}-week streak with a consistency score of ${consistencyScore}%. Well done!`;
  } else {
    summary = `You attended ${attendedCount} out of ${scheduledCount} sessions. Consistency score: ${consistencyScore}%. Keep showing up!`;
  }
  return { summary, highlights };
}
module.exports = { generateProgressSummary };
