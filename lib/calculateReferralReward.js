function calculateReferralReward(referrerId, currentReferralCount, referralEvent, rewardTiers) {
  if (typeof referrerId !== 'string' || !referralEvent || typeof referralEvent.referredClientId !== 'string' || Number.isNaN(Date.parse(referralEvent.date)) || !Array.isArray(rewardTiers)) throw new TypeError('Invalid input');
  const newReferralCount = Math.max(0, Number.isInteger(currentReferralCount) ? currentReferralCount : 0) + 1;
  if (!rewardTiers || rewardTiers.length === 0) {
    return { rewardAmount: 0, rewardType: null, newReferralCount, tierApplied: null };
  }
  const sorted = rewardTiers.filter(t=>t && Number.isInteger(t.minReferrals) && t.minReferrals >= 0 && Number.isFinite(t.rewardAmount) && t.rewardAmount >= 0 && ['discount','free_session','none'].includes(t.rewardType))
    .sort((a, b) => b.minReferrals - a.minReferrals || b.rewardAmount - a.rewardAmount);
  let tierApplied = null;
  let rewardAmount = 0;
  let rewardType = null;
  const tier = sorted.find(item => item.minReferrals <= newReferralCount);
  if (tier) { tierApplied=tier.tier; rewardAmount=tier.rewardAmount; rewardType=tier.rewardType === 'none' ? null : tier.rewardType; }
  return { rewardAmount, rewardType, newReferralCount, tierApplied };
}
module.exports = { calculateReferralReward };
