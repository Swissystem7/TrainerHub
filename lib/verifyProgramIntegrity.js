function verifyProgramIntegrity(program) {
  if (program === null || program === undefined) {
    return { valid: false, errors: ['Program object is null'] };
  }
  const errors = [];
  if (!program.name || typeof program.name !== 'string' || program.name.trim() === '') {
    errors.push('Program name missing');
  }
  if (!Array.isArray(program.exercises)) {
    errors.push('Exercises must be an array');
    return { valid: false, errors };
  }
  const seenNames = new Set();
  for (let i = 0; i < program.exercises.length; i++) {
    const ex = program.exercises[i];
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) {
      errors.push(`Exercise at index ${i}: invalid exercise`);
      continue;
    }
    if (!ex.name || typeof ex.name !== 'string' || ex.name.trim() === '') {
      errors.push(`Exercise at index ${i}: name missing`);
    } else {
      const lowerName = ex.name.toLowerCase();
      if (seenNames.has(lowerName)) {
        errors.push(`Duplicate exercise name: ${ex.name}`);
      }
      seenNames.add(lowerName);
    }
    if (ex.sets === undefined || ex.sets === null) {
      errors.push(`Exercise at index ${i}: sets missing`);
    } else if (typeof ex.sets !== 'number' || !Number.isInteger(ex.sets) || ex.sets <= 0) {
      errors.push(`Exercise at index ${i}: sets must be a positive integer`);
    }
    if (ex.reps === undefined || ex.reps === null) {
      errors.push(`Exercise at index ${i}: reps missing`);
    } else if (typeof ex.reps === 'string') {
      const trimmed = ex.reps.trim();
      if (trimmed === '' || isNaN(Number(trimmed)) || !Number.isInteger(Number(trimmed)) || Number(trimmed) <= 0) {
        errors.push(`Exercise at index ${i}: reps invalid non-numeric string`);
      }
    } else if (typeof ex.reps !== 'number' || !Number.isInteger(ex.reps) || ex.reps <= 0) {
      errors.push(`Exercise at index ${i}: reps must be a positive integer`);
    }
    if (ex.weight !== undefined && ex.weight !== null && (!Number.isFinite(ex.weight) || ex.weight < 0)) {
      errors.push(`Exercise at index ${i}: weight cannot be negative`);
    }
    if (ex.rest !== undefined && ex.rest !== null && (!Number.isFinite(ex.rest) || ex.rest < 0)) {
      errors.push(`Exercise at index ${i}: rest cannot be negative`);
    }
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { verifyProgramIntegrity };
