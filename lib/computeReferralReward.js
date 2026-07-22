function computeReferralReward(referralEvent) {
  if (!referralEvent || !referralEvent.referrerId || !referralEvent.refereeId || !referralEvent.refereeStatus || !referralEvent.referralDate || !referralEvent.rewardRules || typeof referralEvent.rewardRules.amount !== 'number' || !referralEvent.rewardRules.condition) {
    return { rewardAmount: 0, eligible: false, reason: 'Missing required fields' };
  }
  const { referrerId, refereeId, refereeStatus, referralDate, rewardRules } = referralEvent;
  if (referrerId === refereeId) {
    return { rewardAmount: 0, eligible: false, reason: 'Self-referral not allowed' };
  }
  if (!Number.isFinite(rewardRules.amount) || rewardRules.amount <= 0) {
    return { rewardAmount: 0, eligible: false, reason: 'Invalid reward amount' };
  }
  if (refereeStatus === 'refunded' || refereeStatus === 'cancelled') {
    return { rewardAmount: 0, eligible: false, reason: 'Referee status not eligible' };
  }
  const refDate = new Date(referralDate);
  const now = new Date();
  if (!Number.isFinite(refDate.getTime())) {
    return { rewardAmount: 0, eligible: false, reason: 'Invalid referral date' };
  }
  if (refDate > now) {
    return { rewardAmount: 0, eligible: false, reason: 'Referral date is in the future' };
  }
  const diffMs = now - refDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (rewardRules.condition === 'first_payment') {
    if (refereeStatus === 'active') {
      return { rewardAmount: rewardRules.amount, eligible: true };
    }
    return { rewardAmount: 0, eligible: false, reason: 'Referee not active' };
  } else if (rewardRules.condition === 'first_30_days') {
    if (refereeStatus === 'active' && diffDays <= 30) {
      return { rewardAmount: rewardRules.amount, eligible: true };
    }
    return { rewardAmount: 0, eligible: false, reason: 'Condition not met' };
  } else if (rewardRules.condition === 'active_90_days') {
    if (refereeStatus === 'active' && diffDays >= 90) {
      return { rewardAmount: rewardRules.amount, eligible: true };
    }
    return { rewardAmount: 0, eligible: false, reason: 'Condition not met' };
  }
  return { rewardAmount: 0, eligible: false, reason: 'Invalid condition' };
}
module.exports = { computeReferralReward };
