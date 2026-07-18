function optimizeReferralIncentive(campaignData) {
  if (!campaignData || typeof campaignData !== 'object') {
    throw new Error('Missing campaignData');
  }
  const { currentReward, rewardType, avgClientLifetimeValue, referralConversionRate, costPerReward, maxBudget } = campaignData;
  if (currentReward === undefined || rewardType === undefined || avgClientLifetimeValue === undefined || referralConversionRate === undefined || costPerReward === undefined || maxBudget === undefined) {
    throw new Error('Missing fields in campaignData');
  }
  if (![currentReward, avgClientLifetimeValue, referralConversionRate, costPerReward, maxBudget].every(Number.isFinite) || !['percent', 'fixed'].includes(rewardType)) {
    throw new Error('Invalid campaignData');
  }
  if (avgClientLifetimeValue <= 0) {
    return null;
  }
  const baseRate = referralConversionRate;
  const slope = 0.02 / 10;
  let optimalReward = Math.min(currentReward, maxBudget);
  if (optimalReward < 0) optimalReward = 0;
  if (costPerReward * optimalReward > avgClientLifetimeValue) {
    return { optimalReward: 0, projectedNewClients: 0, netRevenue: avgClientLifetimeValue - costPerReward * currentReward };
  }
  const conversion = baseRate + slope * optimalReward;
  const projectedNewClients = conversion * 100;
  const netRevenue = projectedNewClients * avgClientLifetimeValue - costPerReward * optimalReward;
  return { optimalReward, projectedNewClients, netRevenue };
}
module.exports = { optimizeReferralIncentive };
