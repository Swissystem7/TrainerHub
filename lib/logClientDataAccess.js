function logClientDataAccess(actorId, clientId, accessType, ipAddress, timestamp) {
  const { isIP } = require('net');
  const { randomUUID } = require('crypto');
  const validAccessTypes = ['view', 'edit', 'export'];
  const errors = [];
  if (typeof actorId !== 'string' || actorId.trim() === '') {
    errors.push('Invalid actorId: must be a non-empty string');
  }
  if (typeof clientId !== 'string' || clientId.trim() === '') {
    errors.push('Invalid clientId: must be a non-empty string');
  }
  if (!validAccessTypes.includes(accessType)) {
    errors.push('Invalid accessType: must be one of view, edit, export');
  }
  if (typeof ipAddress !== 'string' || isIP(ipAddress.trim()) === 0) {
    errors.push('Invalid ipAddress: must be a valid IPv4 or IPv6 string');
  }
  if (errors.length > 0) {
    return { success: false, logId: '', error: errors.join('; ') };
  }
  const logTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
  const logId = randomUUID();
  const logEntry = {
    logId,
    actorId: actorId.trim(),
    clientId: clientId.trim(),
    accessType,
    ipAddress: ipAddress.trim(),
    timestamp: logTimestamp
  };
  if (!Array.isArray(logClientDataAccess.logs)) {
    logClientDataAccess.logs = [];
  }
  logClientDataAccess.logs.push(logEntry);
  return { success: true, logId, error: undefined };
}
logClientDataAccess.logs = [];
module.exports = { logClientDataAccess };
