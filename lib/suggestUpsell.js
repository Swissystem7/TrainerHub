function suggestUpsell(clientProfile, workoutHistory) {
  if (!clientProfile || !clientProfile.goals || clientProfile.goals.length === 0) {
    return { recommendations: [] };
  }

  const availableUpsells = [
    { item: "Nutrition Plan", price: 49.99, baseProbability: 0.7 },
    { item: "Recovery Session", price: 39.99, baseProbability: 0.6 },
    { item: "Personal Training Package", price: 99.99, baseProbability: 0.5 },
    { item: "Meal Prep Service", price: 79.99, baseProbability: 0.4 },
    { item: "Supplement Pack", price: 29.99, baseProbability: 0.3 }
  ];

  const pastPurchases = clientProfile.pastPurchases || [];
  const filteredUpsells = availableUpsells.filter(u => !pastPurchases.includes(u.item));

  if (filteredUpsells.length === 0) {
    return { recommendations: [] };
  }

  const goals = clientProfile.goals.map(g => g.toLowerCase());
  const avgDuration = clientProfile.avgSessionDuration || 0;
  const attendanceRate = clientProfile.attendanceRate || 0;
  const history = workoutHistory || [];

  const completedSessions = history.filter(w => w.completed).length;
  const totalSessions = history.length;
  const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

  const recommendations = filteredUpsells.map(upsell => {
    let probability = upsell.baseProbability;

    if (goals.includes("weight loss") || goals.includes("fat loss")) {
      if (upsell.item === "Nutrition Plan") probability += 0.2;
      if (upsell.item === "Meal Prep Service") probability += 0.15;
    }
    if (goals.includes("muscle gain") || goals.includes("strength")) {
      if (upsell.item === "Personal Training Package") probability += 0.2;
      if (upsell.item === "Supplement Pack") probability += 0.15;
    }
    if (goals.includes("recovery") || goals.includes("flexibility")) {
      if (upsell.item === "Recovery Session") probability += 0.2;
    }

    if (avgDuration > 45) {
      probability += 0.1;
    }
    if (attendanceRate > 0.8) {
      probability += 0.1;
    }
    if (completionRate > 0.7) {
      probability += 0.1;
    }

    probability = Math.min(1, Math.max(0, probability));
    probability = Math.round(probability * 100) / 100;
    const expectedValue = probability * upsell.price;

    return {
      item: upsell.item,
      probability,
      price: upsell.price,
      expectedValue: Math.round(expectedValue * 100) / 100
    };
  });

  recommendations.sort((a, b) => b.expectedValue - a.expectedValue);

  return { recommendations: recommendations.slice(0, 5) };
}

module.exports = { suggestUpsell };
