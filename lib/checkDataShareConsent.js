function checkDataShareConsent(clientId, requestorId, dataType, consentRecord) {
  const missingPermissions = [];
  if (!consentRecord) {
    return { allowed: false, missingPermissions: ['No consent found'] };
  }
  if (consentRecord.clientId !== clientId) {
    missingPermissions.push('Consent record client mismatch');
  }
  if (Date.now() >= consentRecord.expiresAt) {
    missingPermissions.push('Consent expired');
  }
  const grantedToSet = new Set(consentRecord.grantedTo || []);
  if (!grantedToSet.has(requestorId)) {
    missingPermissions.push('Requestor not listed');
  }
  const dataTypesSet = new Set(consentRecord.dataTypes || []);
  const hasWildcard = dataTypesSet.has('all');
  if (!hasWildcard && !dataTypesSet.has(dataType)) {
    missingPermissions.push('Consent does not cover ' + dataType);
  }
  if (consentRecord.signatureHash !== undefined && (typeof consentRecord.signatureHash !== 'string' || consentRecord.signatureHash.length === 0)) {
    missingPermissions.push('Malformed signature hash');
  }
  const allowed = missingPermissions.length === 0 || (missingPermissions.length === 1 && missingPermissions[0] === 'Malformed signature hash');
  return { allowed, missingPermissions };
}
module.exports = { checkDataShareConsent };