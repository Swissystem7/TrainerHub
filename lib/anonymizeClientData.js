function anonymizeClientData(client, fieldsToAnonymize) {
  if (client === null || client === undefined) {
    throw new TypeError('client must be a non-null object');
  }
  const validFields = Array.isArray(fieldsToAnonymize) ? fieldsToAnonymize.filter(f => typeof f === 'string') : [];
  if (validFields.length === 0) {
    return { ...client };
  }
  const result = { ...client };
  for (const field of validFields) {
    if (!(field in result)) continue;
    const value = result[field];
    if (typeof value === 'string') {
      const hash = require('crypto').createHash('sha256').update(value).digest('hex');
      result[field] = hash.substring(0, 8);
    } else if (typeof value === 'number') {
      result[field] = null;
    } else if (typeof value === 'boolean') {
      result[field] = null;
    } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      result[field] = '[ANONYMIZED]';
    }
  }
  return result;
}
module.exports = { anonymizeClientData };