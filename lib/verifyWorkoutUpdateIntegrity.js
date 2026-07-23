function verifyWorkoutUpdateIntegrity(currentPlanHash, updateRequest, allowedTrainers) {
  const issues = [];
  if (!Array.isArray(allowedTrainers) || allowedTrainers.length === 0) {
    return { valid: false, issues: ['No trainers authorized'] };
  }
  if (!updateRequest || !updateRequest.newPlan) {
    return { valid: false, issues: ['No new plan provided'] };
  }
  const { newPlan, requestorId, timestamp } = updateRequest;
  if (!requestorId || !allowedTrainers.includes(requestorId)) {
    return { valid: false, issues: ['Requestor not authorized'] };
  }
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  if (!Number.isFinite(timestamp) || Math.abs(timestamp - now) > twentyFourHours) {
    issues.push('Timestamp out of acceptable range');
  }
  const newPlanHash = require('crypto').createHash('sha256').update(JSON.stringify(newPlan)).digest('hex');
  if (currentPlanHash === null) {
    return { valid: true, issues };
  }
  if (newPlanHash === currentPlanHash) {
    issues.push('No changes detected');
    return { valid: false, issues };
  }
  return { valid: true, issues };
}
module.exports = { verifyWorkoutUpdateIntegrity };
