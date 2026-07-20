const usedReferralCodes = new Set();
const referralBalances = new Map();

function processReferralReward(referrerClientId, referredClientId, referralCode, rewardType, rewardValue, validityDays) {
  if (referrerClientId === referredClientId) {
    return { error: 'Self-referral not allowed' };
  }
  if (!Number.isFinite(rewardValue) || rewardValue <= 0) {
    return { error: 'Invalid reward value' };
  }
  if (rewardType !== 'discount' && rewardType !== 'credit') {
    return { error: 'Invalid reward type' };
  }
  if (usedReferralCodes.has(referralCode)) {
    const existingBalance = referralBalances.get(referrerClientId) || 0;
    return { success: false, rewardApplied: false, newBalance: existingBalance, expiry: null };
  }
  usedReferralCodes.add(referralCode);
  const days = Number.isInteger(validityDays) && validityDays >= 1 ? validityDays : 30;
  const expiryDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  const newBalance = (referralBalances.get(referrerClientId) || 0) + rewardValue;
  referralBalances.set(referrerClientId, newBalance);
  return { success: true, rewardApplied: true, newBalance: newBalance, expiryDate: expiryDate };
}
module.exports = { processReferralReward };
