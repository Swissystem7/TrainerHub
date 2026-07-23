const crypto = require('crypto');

function logProgramChange({ programId, trainerId, previousState, newState, changeType }) {
  if (newState === null || newState === undefined) {
    throw new Error("invalid input");
  }
  const allowedTypes = new Set(['create','update','delete','revert']);
  const effectiveChangeType = allowedTypes.has(changeType) ? changeType : 'update';
  const prev = previousState == null ? {} : previousState;
  const deterministicStringify = (obj) => {
    if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(deterministicStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + deterministicStringify(obj[k])).join(',') + '}';
  };
  const timestamp = new Date().toISOString();
  const payload = deterministicStringify({programId, trainerId, previousState: prev, newState, changeType: effectiveChangeType, timestamp});
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  const logId = hash;
  return { logId, timestamp, hash };
}
module.exports = { logProgramChange };
