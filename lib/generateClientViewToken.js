function generateClientViewToken(clientId, expiryMinutes, secret) {
  const crypto = require('crypto');
  if (typeof clientId !== 'string' || clientId.length === 0) {
    return { token: null, expiresAt: 0, error: 'Invalid clientId' };
  }
  if (!Number.isInteger(expiryMinutes) || expiryMinutes <= 0 || expiryMinutes > 1440) {
    return { token: null, expiresAt: 0, error: 'Invalid expiryMinutes' };
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    return { token: null, expiresAt: 0, error: 'Secret too short' };
  }
  const expiresAt = Math.floor(Date.now() / 1000) + expiryMinutes * 60;
  const clientIdBytes = Buffer.from(clientId, 'utf8');
  const clientIdLen = clientIdBytes.length;
  if (clientIdLen > 255) {
    return { token: null, expiresAt: 0, error: 'clientId is too long' };
  }
  const payload = Buffer.alloc(2 + clientIdLen + 4 + 8);
  payload[0] = 1;
  payload[1] = clientIdLen;
  clientIdBytes.copy(payload, 2);
  payload.writeUInt32BE(expiresAt, 2 + clientIdLen);
  crypto.randomBytes(8).copy(payload, 2 + clientIdLen + 4);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest().subarray(0, 16);
  return { token: Buffer.concat([payload, signature]).toString('base64url'), expiresAt, error: undefined };
}
module.exports = { generateClientViewToken };
