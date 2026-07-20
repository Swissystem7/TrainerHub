function generateAdherenceHeatmap(clientId, prescribedProgram, actualLogs) {
  if (!Array.isArray(actualLogs) || actualLogs.length === 0) return { weeks: [] };
  if (!prescribedProgram || !Array.isArray(prescribedProgram.days) || prescribedProgram.days.length === 0) return { weeks: [] };

  const sortedLogs = actualLogs.filter(log => log && Number.isFinite(Date.parse(log.date))).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortedLogs.length === 0) return { weeks: [] };
  const earliestDate = new Date(sortedLogs[0].date);
  const latestDate = new Date(sortedLogs[sortedLogs.length - 1].date);

  const startOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day;
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  const weekStart = startOfWeek(earliestDate);
  const weeks = [];
  let currentWeekStart = new Date(weekStart);

  while (currentWeekStart <= latestDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const weekLogs = sortedLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= currentWeekStart && logDate < weekEnd;
    });

    const exerciseStats = new Map();
    for (const day of prescribedProgram.days) {
      const dayOfWeek = day.dayOffset;
      for (const exerciseName of day.exercises) {
        if (!exerciseName || typeof exerciseName !== 'string') continue;
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
        const dayLogs = weekLogs.filter(log => new Date(log.date).getUTCDay() === dayOfWeek);
        let loggedCount = 0;
        for (const log of dayLogs) {
          if (log.completedExercises && log.completedExercises.includes(exerciseName)) {
            loggedCount++;
          }
        }
        const stat = exerciseStats.get(exerciseName) || { logged: 0, prescribed: 0 };
        stat.logged += Math.min(loggedCount, 1); stat.prescribed++;
        exerciseStats.set(exerciseName, stat);
      }
    }

    weeks.push({
      weekStart: currentWeekStart.toISOString(),
      exercises: [...exerciseStats].map(([exerciseName, stat]) => ({ exerciseName, completionPercent: Math.min(100, stat.logged / stat.prescribed * 100) }))
    });

    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7);
  }

  return { weeks };
}

module.exports = { generateAdherenceHeatmap };
