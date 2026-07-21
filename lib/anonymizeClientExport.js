function anonymizeClientExport(data, fieldsToAnonymize, maskChar = '*') {
  if (maskChar.length !== 1) {
    throw new TypeError('maskChar must be a single character');
  }
  if (!Array.isArray(data)) {
    throw new TypeError('data must be an array');
  }
  if (!Array.isArray(fieldsToAnonymize)) {
    throw new TypeError('fieldsToAnonymize must be an array');
  }
  if (data.length === 0) {
    return [];
  }
  if (fieldsToAnonymize.length === 0) {
    return data.map(obj => ({ ...obj }));
  }
  const fieldSet = new Set(fieldsToAnonymize);
  return data.map(record => {
    const newRecord = { ...record };
    for (const field of fieldSet) {
      if (field in newRecord && newRecord[field] !== null && newRecord[field] !== undefined) {
        const original = newRecord[field];
        const str = String(original);
        newRecord[field] = maskChar.repeat(str.length);
      }
    }
    return newRecord;
  });
}
module.exports = { anonymizeClientExport };