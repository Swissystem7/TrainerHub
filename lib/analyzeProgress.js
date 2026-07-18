function analyzeProgress(clientId, sessions, metric) {
  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new Error('Invalid clientId');
  }
  if (!Array.isArray(sessions)) {
    throw new Error('sessions must be an array');
  }
  const validMetrics = ['maxWeight', 'totalVolume', 'avgReps', 'consistentAttendance'];
  if (!validMetrics.includes(metric)) {
    throw new Error('Invalid metric string');
  }
  if (sessions.length === 0) {
    return { trend: 'no data', percentageChange: null, bestSession: null, message: 'No sessions recorded' };
  }
  if (sessions.length === 1) {
    return { trend: 'insufficient data', percentageChange: null, bestSession: null, message: 'Only one session recorded' };
  }
  const hasValidData = sessions.some(s => s.exercises && s.exercises.length > 0 && s.exercises.some(e => e.weight !== undefined || e.reps !== undefined || e.sets !== undefined));
  if (!hasValidData) {
    return { trend: 'no data', percentageChange: null, bestSession: null, message: 'No valid exercise data found' };
  }
  if (metric === 'maxWeight') {
    let maxWeight = -Infinity;
    let bestSession = null;
    for (const session of sessions) {
      if (!session.exercises) continue;
      for (const ex of session.exercises) {
        if (ex.weight !== undefined && ex.weight !== null && ex.weight > maxWeight) {
          maxWeight = ex.weight;
          bestSession = session;
        }
      }
    }
    if (maxWeight === -Infinity) {
      return { trend: 'no data', percentageChange: null, bestSession: null, message: 'No weight data found' };
    }
    const sorted = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const last3 = sorted.slice(-3);
    const prev3 = sorted.slice(-6, -3);
    const getMaxWeight = (arr) => {
      let m = -Infinity;
      for (const s of arr) {
        if (!s.exercises) continue;
        for (const ex of s.exercises) {
          if (ex.weight !== undefined && ex.weight !== null && ex.weight > m) m = ex.weight;
        }
      }
      return m === -Infinity ? null : m;
    };
    const lastMax = getMaxWeight(last3);
    const prevMax = getMaxWeight(prev3);
    let percentageChange = null;
    if (lastMax !== null && prevMax !== null && prevMax !== 0) {
      percentageChange = ((lastMax - prevMax) / prevMax) * 100;
    } else if (lastMax !== null && prevMax === null) {
      percentageChange = null;
    }
    let trend = 'stable';
    if (percentageChange !== null) {
      if (percentageChange > 5) trend = 'improving';
      else if (percentageChange < -5) trend = 'declining';
    }
    return { trend, percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null, bestSession, message: '' };
  }
  if (metric === 'totalVolume') {
    const hasVolumeData = sessions.some(s => Array.isArray(s.exercises) && s.exercises.some(e => Number.isFinite(e.weight) && Number.isFinite(e.reps) && Number.isFinite(e.sets)));
    if (!hasVolumeData) {
      return { trend: 'no data', percentageChange: null, bestSession: null, message: 'No valid exercise data found' };
    }
    const getVolume = (session) => {
      if (!session.exercises) return 0;
      let vol = 0;
      for (const ex of session.exercises) {
        if (Number.isFinite(ex.weight) && Number.isFinite(ex.reps) && Number.isFinite(ex.sets)) {
          vol += ex.weight * ex.reps * ex.sets;
        }
      }
      return vol;
    };
    const volumes = sessions.map(s => getVolume(s));
    const sorted = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const last3Vol = sorted.slice(-3).map(s => getVolume(s));
    const prev3Vol = sorted.slice(-6, -3).map(s => getVolume(s));
    const avgLast = last3Vol.reduce((a, b) => a + b, 0) / last3Vol.length;
    const avgPrev = prev3Vol.length > 0 ? prev3Vol.reduce((a, b) => a + b, 0) / prev3Vol.length : 0;
    let percentageChange = null;
    if (avgPrev !== 0) {
      percentageChange = ((avgLast - avgPrev) / avgPrev) * 100;
    } else if (avgLast !== 0) {
      percentageChange = null;
    }
    let trend = 'stable';
    if (percentageChange !== null) {
      if (percentageChange > 5) trend = 'improving';
      else if (percentageChange < -5) trend = 'declining';
    }
    let maxVol = -Infinity;
    let bestSession = null;
    for (let i = 0; i < sessions.length; i++) {
      const v = volumes[i];
      if (v > maxVol) {
        maxVol = v;
        bestSession = sessions[i];
      }
    }
    return { trend, percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null, bestSession, message: '' };
  }
  if (metric === 'avgReps') {
    const getAvgReps = (session) => {
      if (!session.exercises || session.exercises.length === 0) return null;
      let totalReps = 0;
      let count = 0;
      for (const ex of session.exercises) {
        if (ex.reps !== undefined && ex.reps !== null) {
          totalReps += ex.reps;
          count++;
        }
      }
      return count > 0 ? totalReps / count : null;
    };
    const avgs = sessions.map(s => getAvgReps(s));
    const validAvgs = avgs.filter(a => a !== null);
    if (validAvgs.length === 0) {
      return { trend: 'no data', percentageChange: null, bestSession: null, message: 'No rep data found' };
    }
    const sorted = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const last3 = sorted.slice(-3).map(s => getAvgReps(s)).filter(a => a !== null);
    const prev3 = sorted.slice(-6, -3).map(s => getAvgReps(s)).filter(a => a !== null);
    const avgLast = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : null;
    const avgPrev = prev3.length > 0 ? prev3.reduce((a, b) => a + b, 0) / prev3.length : null;
    let percentageChange = null;
    if (avgLast !== null && avgPrev !== null && avgPrev !== 0) {
      percentageChange = ((avgLast - avgPrev) / avgPrev) * 100;
    }
    let trend = 'stable';
    if (percentageChange !== null) {
      if (percentageChange > 5) trend = 'improving';
      else if (percentageChange < -5) trend = 'declining';
    }
    let bestAvg = -Infinity;
    let bestSession = null;
    for (let i = 0; i < avgs.length; i++) {
      if (avgs[i] !== null && avgs[i] > bestAvg) {
        bestAvg = avgs[i];
        bestSession = sessions[i];
      }
    }
    return { trend, percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null, bestSession, message: '' };
  }
  if (metric === 'consistentAttendance') {
    const sorted = sessions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const last3 = sorted.slice(-3);
    const prev3 = sorted.slice(-6, -3);
    const lastCount = last3.length;
    const prevCount = prev3.length;
    let percentageChange = null;
    if (prevCount > 0) {
      percentageChange = ((lastCount - prevCount) / prevCount) * 100;
    }
    let trend = 'stable';
    if (percentageChange !== null) {
      if (percentageChange > 0) trend = 'improving';
      else if (percentageChange < 0) trend = 'declining';
    }
    let bestSession = null;
    if (sorted.length > 0) {
      bestSession = sorted[sorted.length - 1];
    }
    return { trend, percentageChange: percentageChange !== null ? Math.round(percentageChange * 100) / 100 : null, bestSession, message: '' };
  }
}
module.exports = { analyzeProgress };
