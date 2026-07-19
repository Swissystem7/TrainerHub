function importClientsFromCSV(csvData, existingClientEmails) {
  const result = { importedCount: 0, duplicateCount: 0, errors: [] };
  if (!csvData || csvData.trim().length === 0) {
    result.errors.push({ row: 0, reason: "Empty CSV string" });
    return result;
  }
  const lines = csvData.split(/\r?\n/);
  if (lines.length < 2) {
    result.errors.push({ row: 0, reason: "No data rows" });
    return result;
  }
  const headerLine = lines[0].trim();
  if (!headerLine) {
    result.errors.push({ row: 0, reason: "No headers row" });
    return result;
  }
  const headers = headerLine.split(",").map(h => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");
  const goalsIdx = headers.indexOf("goals");
  if (emailIdx === -1) {
    result.errors.push({ row: 0, reason: "No email column present" });
    return result;
  }
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }
  const existingLower = (Array.isArray(existingClientEmails) ? existingClientEmails : []).filter(e => typeof e === 'string').map(e => e.trim().toLowerCase());
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = line.split(",");
    const rowNum = i + 1;
    const name = nameIdx !== -1 ? (fields[nameIdx] || "").trim() : "";
    const email = emailIdx !== -1 ? (fields[emailIdx] || "").trim() : "";
    if (!name || !email) {
      result.errors.push({ row: rowNum, reason: "Missing name or email" });
      continue;
    }
    const emailLower = email.toLowerCase();
    let isDuplicate = false;
    for (const existing of existingLower) {
      if (levenshtein(emailLower, existing) < 2) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) {
      result.duplicateCount++;
      result.errors.push({ row: rowNum, reason: "Duplicate email" });
      continue;
    }
    result.importedCount++;
  }
  return result;
}
module.exports = { importClientsFromCSV };
