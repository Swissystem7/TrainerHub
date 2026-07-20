function processClientOnboardingStep(currentState, stepData) {
  const errors = [];
  const step = currentState && currentState.step;
  stepData = stepData || {};

  if (![1, 2, 3].includes(step)) {
    return { success: false, nextStep: null, errors: ['Invalid step'] };
  }

  if (step === 1) {
    const info = stepData.info;
    if (!info || typeof info.name !== 'string' || info.name.trim().length === 0) {
      errors.push('Name is required and must be non-empty');
    }
    if (!info || typeof info.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) {
      errors.push('Valid email is required');
    }
    if (errors.length > 0) {
      return { success: false, nextStep: null, errors };
    }
    return { success: true, nextStep: 2, errors: [] };
  }

  if (step === 2) {
    const goals = stepData.goals;
    if (!Array.isArray(goals) || goals.length === 0) {
      errors.push('At least one goal is required');
    }
    if (errors.length > 0) {
      return { success: false, nextStep: null, errors };
    }
    return { success: true, nextStep: 3, errors: [] };
  }

  if (step === 3) {
    const assessment = stepData.initialAssessment;
    if (!assessment || !Number.isFinite(assessment.weight) || assessment.weight <= 0) {
      errors.push('Weight must be greater than 0');
    }
    if (errors.length > 0) {
      return { success: false, nextStep: null, errors };
    }
    return { success: true, nextStep: null, errors: [] };
  }

  return { success: false, nextStep: null, errors: ['Invalid step'] };
}

module.exports = { processClientOnboardingStep };
