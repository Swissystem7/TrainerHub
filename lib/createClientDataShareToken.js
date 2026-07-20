const crypto = require('crypto');

const ALLOWED_SCOPES = new Set(['workouts', 'progress', 'measurements', 'notes']);
const MAX_EXPIRATION = 10080;

let serverSecret = null;

function setServerSecret(secret) {
  serverSecret = secret;
}

function base64urlEncode(data) {
  return Buffer.from(data).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

function hmacSha256Base64url(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createClientDataShareToken(clientId, requesterId, dataScope, expirationMinutes) {
  if (!serverSecret) {
    throw new Error('Internal error: server secret not set');
  }
  if (typeof clientId !== 'string' || clientId.trim() === '') {
    throw new Error('clientId must be a non-empty string');
  }
  if (typeof requesterId !== 'string' || requesterId.trim() === '') {
    throw new Error('requesterId must be a non-empty string');
  }
  if (!Array.isArray(dataScope) || dataScope.length === 0) {
    throw new Error('dataScope must be a non-empty array');
  }
  for (const scope of dataScope) {
    if (!ALLOWED_SCOPES.has(scope)) {
      throw new Error(`Invalid scope value: ${scope}`);
    }
  }
  if (!Number.isInteger(expirationMinutes) || expirationMinutes <= 0 || expirationMinutes > MAX_EXPIRATION) {
    throw new Error('expirationMinutes must be a positive integer <= 10080');
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expirationMinutes * 60;
  const payload = { clientId, requesterId, scope: dataScope, iat, exp };
  const header = { alg: 'HS256', typ: 'JWT' };

  const headerEncoded = base64urlEncode(JSON.stringify(header));
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = hmacSha256Base64url(serverSecret, signatureInput);
  const token = `${headerEncoded}.${payloadEncoded}.${signature}`;

  const expiresAt = new Date(exp * 1000).toISOString();

  return { token, expiresAt, scope: dataScope };
}

module.exports = { createClientDataShareToken, setServerSecret };