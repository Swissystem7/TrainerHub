function generateUpsellSuggestions(clientProfile, serviceCatalog) {
  if (!clientProfile || !Array.isArray(serviceCatalog)) throw new TypeError('Invalid input');
  if (serviceCatalog.length === 0) return [];
  const { goals, currentPlanId, progress } = clientProfile;
  if (!goals || goals.length === 0) return [];
  const ownedIds = new Set();
  if (currentPlanId) ownedIds.add(currentPlanId);
  const suggestions = [];
  const hasProgress = progress && progress.length > 0;
  const avgConversion = 0.15;
  for (const service of serviceCatalog) {
    if (!service || typeof service.id !== 'string' || !Number.isFinite(service.price) || service.price < 0 || !Array.isArray(service.targetGoals)) continue;
    if (ownedIds.has(service.id)) continue;
    if (service.prerequisites && service.prerequisites.length > 0) {
      let hasAll = true;
      for (const pre of service.prerequisites) {
        if (!ownedIds.has(pre)) { hasAll = false; break; }
      }
      if (!hasAll) continue;
    }
    let goalMatch = false;
    for (const g of goals) {
      if (service.targetGoals.includes(g)) { goalMatch = true; break; }
    }
    if (!goalMatch) continue;
    let prob = avgConversion;
    if (hasProgress) {
      let trendScore = 0;
      let count = 0;
      const ordered = progress.filter(p=>p && typeof p.metric==='string' && Number.isFinite(p.value) && !Number.isNaN(Date.parse(p.date))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
      for (let i = 1; i < ordered.length; i++) {
        if (ordered[i].metric === ordered[i-1].metric) {
          const diff = ordered[i].value - ordered[i-1].value;
          if (diff > 0) trendScore += 0.05;
          else if (diff < 0) trendScore -= 0.03;
          count++;
        }
      }
      if (count > 0) {
        prob = Math.min(0.95, Math.max(0.05, avgConversion + trendScore / count));
      }
    }
    prob = Math.round(prob * 100) / 100;
    const expectedRevenueIncrease = service.price * prob;
    suggestions.push({
      serviceId: service.id,
      predictedConversionProb: prob,
      expectedRevenueIncrease: Math.round(expectedRevenueIncrease * 100) / 100,
      reasoning: `Matches goal(s) ${goals.filter(g => service.targetGoals.includes(g)).join(', ')}`
    });
  }
  suggestions.sort((a, b) => b.expectedRevenueIncrease - a.expectedRevenueIncrease);
  return suggestions.slice(0, 3);
}
module.exports = { generateUpsellSuggestions };
