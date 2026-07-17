function calculateChurnRisk(clientEngagementHistory, clientDemographics) {
  if (!clientEngagementHistory || clientEngagementHistory.length === 0 || clientEngagementHistory.every(e => e.attendance === null && e.programAdherence === null && e.communication === 'none')) {
    return { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] };
  }
  const validEntries = clientEngagementHistory.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return !isNaN(d.getTime());
  });
  if (validEntries.length === 0) {
    return { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] };
  }
  if (validEntries.length === 1) {
    const entry = validEntries[0];
    const comm = typeof entry.communication === 'string' ? entry.communication.toLowerCase() : 'low';
    const validComm = ['none','low','medium','high'].includes(comm) ? comm : 'low';
    if (validComm === 'none' && entry.attendance === false) {
      return { churnProbability: 0.85, riskLevel: 'high', contributingFactors: ['declining attendance','no recent communication'] };
    }
    return { churnProbability: 0.5, riskLevel: 'medium', contributingFactors: ['insufficient data'] };
  }
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const lastMonth = validEntries.filter(e => new Date(e.date) >= oneMonthAgo);
  const prevThreeMonths = validEntries.filter(e => new Date(e.date) >= threeMonthsAgo && new Date(e.date) < oneMonthAgo);
  const calcAvg = (arr, field) => {
    const vals = arr.map(e => e[field]).filter(v => v !== null && v !== undefined);
    if (vals.length === 0) return null;
    return vals.reduce((a,b) => a+b, 0) / vals.length;
  };
  const calcCommScore = (arr) => {
    const map = {'none':0,'low':0.33,'medium':0.66,'high':1.0};
    const vals = arr.map(e => {
      const c = typeof e.communication === 'string' ? e.communication.toLowerCase() : 'low';
      return map[c] !== undefined ? map[c] : 0.33;
    });
    if (vals.length === 0) return null;
    return vals.reduce((a,b) => a+b, 0) / vals.length;
  };
  const avgAttLast = calcAvg(lastMonth, 'attendance');
  const avgAttPrev = calcAvg(prevThreeMonths, 'attendance');
  const avgAdhLast = calcAvg(lastMonth, 'programAdherence');
  const avgAdhPrev = calcAvg(prevThreeMonths, 'programAdherence');
  const avgCommLast = calcCommScore(lastMonth);
  const avgCommPrev = calcCommScore(prevThreeMonths);
  const overallAtt = calcAvg(validEntries, 'attendance');
  const overallAdh = calcAvg(validEntries, 'programAdherence');
  const overallComm = calcCommScore(validEntries);
  const avgAttendance = overallAtt !== null ? overallAtt : 0.5;
  const avgAdherence = overallAdh !== null ? overallAdh : 0.5;
  const avgCommScore = overallComm !== null ? overallComm : 0.33;
  const age = typeof clientDemographics.age === 'number' && clientDemographics.age >= 10 ? clientDemographics.age : 30;
  const tenureMonths = typeof clientDemographics.tenureMonths === 'number' && clientDemographics.tenureMonths >= 0 ? clientDemographics.tenureMonths : 0;
  const tenureFactor = Math.min(tenureMonths / 24, 0.1);
  let risk = (1 - avgAttendance) * 0.4 + (1 - avgAdherence) * 0.3 + (1 - avgCommScore) * 0.2 + (1 - tenureFactor) * 0.1;
  risk = Math.min(Math.max(risk, 0), 1);
  const churnProbability = Math.round(risk * 100) / 100;
  let riskLevel = 'medium';
  if (churnProbability < 0.3) riskLevel = 'low';
  else if (churnProbability > 0.6) riskLevel = 'high';
  const factors = [];
  if (avgAttLast !== null && avgAttPrev !== null && avgAttPrev > 0 && (avgAttPrev - avgAttLast) / avgAttPrev > 0.2) {
    factors.push('declining attendance');
  }
  if (avgAdhLast !== null && avgAdhPrev !== null && avgAdhPrev > 0 && (avgAdhPrev - avgAdhLast) / avgAdhPrev > 0.2) {
    factors.push('low adherence');
  }
  if (avgCommLast !== null && avgCommPrev !== null && avgCommPrev > 0 && (avgCommPrev - avgCommLast) / avgCommPrev > 0.2) {
    factors.push('no recent communication');
  }
  if (tenureMonths < 3) {
    factors.push('short tenure');
  }
  if (factors.length === 0) {
    factors.push('stable engagement');
  }
  return { churnProbability, riskLevel, contributingFactors: factors };
}
module.exports = { calculateChurnRisk };
