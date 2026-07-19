function logAuditEvent(userId, action, targetId, details) {
  const { randomUUID } = require('crypto');
  const allowedActions = ['create','read','update','delete','export','share'];
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new TypeError('userId must be a non-empty string');
  }
  if (typeof action !== 'string' || !allowedActions.includes(action)) {
    throw new TypeError('action must be one of: ' + allowedActions.join(', '));
  }
  if (typeof targetId !== 'string' || targetId.length === 0) {
    throw new TypeError('targetId must be a non-empty string');
  }
  const user = userId.trim();
  const safeDetails = (details === null || details === undefined) ? {} : details;
  if (typeof safeDetails !== 'object' || Array.isArray(safeDetails)) throw new TypeError('details must be an object');
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  return {
    success: true,
    entry: {
      id,
      timestamp,
      user,
      action,
      target: targetId,
      details: safeDetails
    }
  };
}
module.exports = { logAuditEvent };
