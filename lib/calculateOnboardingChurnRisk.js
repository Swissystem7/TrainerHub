function calculateOnboardingChurnRisk(client) {
  if (!client || typeof client !== 'object') {
    throw new Error('Invalid client object');
  }
  if (!client.email || typeof client.email !== 'string') {
    throw new Error('Missing required email field');
  }

  const riskFactors = [];
  let riskScore = 0;

  if (!client.name || typeof client.name !== 'string' || client.name.trim() === '') {
    riskScore += 20;
    riskFactors.push('Missing name');
  }

  if (!client.phone || typeof client.phone !== 'string' || client.phone.trim() === '') {
    riskScore += 15;
    riskFactors.push('Missing phone');
  }

  if (!client.goals || !Array.isArray(client.goals) || client.goals.length === 0) {
    riskScore += 25;
    riskFactors.push('No goals defined');
  }

  const today = new Date();
  let startDate;
  try {
    startDate = new Date(client.startDate);
    if (isNaN(startDate.getTime())) throw new Error('Invalid startDate');
  } catch {
    riskFactors.push('Invalid startDate string');
    riskScore = Math.min(riskScore, 100);
    return { riskScore, riskFactors };
  }

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (startDate < sevenDaysAgo) {
    let lastLogin;
    try {
      lastLogin = new Date(client.lastLogin);
      if (isNaN(lastLogin.getTime())) throw new Error('Invalid lastLogin');
    } catch {
      riskFactors.push('Invalid lastLogin string');
      riskScore = Math.min(riskScore, 100);
      return { riskScore, riskFactors };
    }
    if (lastLogin <= startDate) {
      riskScore += 30;
      riskFactors.push('Start date older than 7 days with no login after start');
    }
  }

  let lastLogin;
  try {
    lastLogin = new Date(client.lastLogin);
    if (isNaN(lastLogin.getTime())) throw new Error('Invalid lastLogin');
  } catch {
    riskFactors.push('Invalid lastLogin string');
    riskScore = Math.min(riskScore, 100);
    return { riskScore, riskFactors };
  }

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  if (lastLogin < threeDaysAgo) {
    riskScore += 10;
    riskFactors.push('Last login more than 3 days ago');
  }

  riskScore = Math.min(riskScore, 100);
  return { riskScore, riskFactors };
}

module.exports = { calculateOnboardingChurnRisk };