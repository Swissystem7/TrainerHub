function detectInactiveClients(trainerId, daysThreshold = 14) {
  const trainers = [
    { id: 't1', name: 'Trainer One', clients: ['c1', 'c2', 'c3'] },
    { id: 't2', name: 'Trainer Two', clients: ['c4', 'c5'] },
  ];
  const activities = [
    { clientId: 'c1', date: '2025-03-01' },
    { clientId: 'c2', date: '2025-02-15' },
    { clientId: 'c3', date: null },
    { clientId: 'c4', date: '2025-03-10' },
    { clientId: 'c5', date: '2025-03-05' },
  ];
  const clientNames = {
    c1: 'Alice',
    c2: 'Bob',
    c3: 'Charlie',
    c4: 'Diana',
    c5: 'Eve',
  };

  if (!trainerId || typeof trainerId !== 'string') {
    return { error: 'Trainer not found' };
  }

  const trainer = trainers.find(t => t.id === trainerId);
  if (!trainer) {
    return { error: 'Trainer not found' };
  }

  let adjustedThreshold = false;
  if (typeof daysThreshold !== 'number' || !Number.isInteger(daysThreshold) || daysThreshold <= 0) {
    daysThreshold = 14;
    adjustedThreshold = true;
  }

  const now = new Date();
  const inactiveClients = [];

  for (const clientId of trainer.clients) {
    const activity = activities.find(a => a.clientId === clientId);
    const lastActivityDate = activity ? activity.date : null;
    let daysSinceLastActivity;
    let churnRisk;

    if (lastActivityDate === null) {
      daysSinceLastActivity = Infinity;
      churnRisk = 'high';
    } else {
      const lastDate = new Date(lastActivityDate);
      const diffTime = now.getTime() - lastDate.getTime();
      daysSinceLastActivity = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (daysSinceLastActivity > 30) {
        churnRisk = 'high';
      } else if (daysSinceLastActivity > 14) {
        churnRisk = 'medium';
      } else {
        churnRisk = 'low';
      }
    }

    if (daysSinceLastActivity >= daysThreshold) {
      inactiveClients.push({
        clientId,
        clientName: clientNames[clientId] || 'Unknown',
        lastActivityDate,
        daysSinceLastActivity,
        churnRisk,
      });
    }
  }

  const result = { inactiveClients };
  if (adjustedThreshold) {
    result.warning = 'daysThreshold adjusted to 14';
  }
  return result;
}

module.exports = { detectInactiveClients };
