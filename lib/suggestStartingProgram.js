function suggestStartingProgram(clientProfile) {
  clientProfile = clientProfile || {};
  const { age, fitnessLevel, goals, injuries } = clientProfile;
  const goalPriority = ['strength', 'endurance', 'weight loss', 'general fitness'];
  let primaryGoal = 'general fitness';
  if (Array.isArray(goals) && goals.length > 0) {
    for (const g of goalPriority) {
      if (goals.includes(g)) {
        primaryGoal = g;
        break;
      }
    }
  }
  const templateMap = {
    'strength': 'Strength Foundation',
    'endurance': 'Cardio Base',
    'weight loss': 'HIIT Starter',
    'general fitness': 'Full Body Basics'
  };
  const templateName = templateMap[primaryGoal];
  const levelMap = {
    'beginner': { setsModifier: 0.8, repRange: [8, 12] },
    'intermediate': { setsModifier: 1.0, repRange: [10, 15] },
    'advanced': { setsModifier: 1.2, repRange: [12, 18] }
  };
  const level = levelMap[fitnessLevel] || levelMap['beginner'];
  let setsModifier = level.setsModifier;
  const repRange = level.repRange;
  if (Array.isArray(injuries) && injuries.length > 0) {
    setsModifier = Math.max(0.5, setsModifier - 0.1 * injuries.length);
  }
  if (age < 18) {
    setsModifier = Math.min(setsModifier, 0.9);
  }
  setsModifier = Math.round(setsModifier * 10) / 10;
  return { templateName, adjustments: { setsModifier, repRange } };
}
module.exports = { suggestStartingProgram };
