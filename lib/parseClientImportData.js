function parseClientImportData(rawText, existingEmails) {
  const profiles = [];
  const errors = [];
  const lines = (typeof rawText === 'string' ? rawText : '').split(/\r?\n/);
  const existing = Array.isArray(existingEmails) ? new Set(existingEmails.map(e => String(e).toLowerCase())) : new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const lineNum = i + 1;
    let email = '';
    let name = '';
    let goals = [];
    let injuries = [];
    let equipment = [];
    let experienceLevel = 'beginner';
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      email = emailMatch[0];
    } else {
      errors.push({line: lineNum, reason: 'No email found'});
      continue;
    }
    if (existing.has(email.toLowerCase())) {
      errors.push({line: lineNum, reason: 'Duplicate email'});
      continue;
    }
    const nameMatch = line.match(/name[:\s]*([^,;\t\n]+)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    } else {
      const possibleName = line.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).slice(0,2).join(' ');
      if (possibleName) name = possibleName;
    }
    const goalsMatch = line.match(/goals[:\s]*([^,;\t\n]+)/i);
    if (goalsMatch) {
      goals = goalsMatch[1].split(/[,;]/).map(g => g.trim()).filter(g => g);
    }
    const injuriesMatch = line.match(/injuries[:\s]*([^,;\t\n]+)/i);
    if (injuriesMatch) {
      injuries = injuriesMatch[1].split(/[,;]/).map(i => i.trim()).filter(i => i);
    }
    const equipmentMatch = line.match(/equipment[:\s]*([^,;\t\n]+)/i);
    if (equipmentMatch) {
      equipment = equipmentMatch[1].split(/[,;]/).map(e => e.trim()).filter(e => e);
    }
    const expMatch = line.match(/experience[:\s]*(beginner|intermediate|advanced)/i);
    if (expMatch) {
      experienceLevel = expMatch[1].toLowerCase();
    }
    profiles.push({
      name: name || '',
      email: email,
      goals: goals,
      injuries: injuries,
      equipment: equipment,
      experienceLevel: experienceLevel
    });
    existing.add(email.toLowerCase());
  }
  return { profiles, errors };
}
module.exports = { parseClientImportData };
