function optimizePackagePrice(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return { suggestedPrice: 50, confidence: 'low' };
  }
  const valid = history.filter(e => e && Number.isFinite(e.price) && e.price > 0 &&
    Number.isFinite(e.sessionsBooked) && e.sessionsBooked >= 0);
  if (valid.length === 0) {
    return { suggestedPrice: 50, confidence: 'low' };
  }
  if (valid.length <= 1) {
    const avg = valid.reduce((s, e) => s + e.price, 0) / valid.length;
    return { suggestedPrice: Math.max(1, Math.round(avg)), confidence: 'low' };
  }
  const allSamePrice = valid.every(e => e.price === valid[0].price);
  if (allSamePrice) {
    return { suggestedPrice: Math.max(1, Math.round(valid[0].price)), confidence: 'low' };
  }
  const n = valid.length;
  let sumLogP = 0, sumLogB = 0, sumLogP2 = 0, sumLogPlogB = 0;
  for (const e of valid) {
    const lp = Math.log(e.price);
    const lb = Math.log(e.sessionsBooked + 1);
    sumLogP += lp;
    sumLogB += lb;
    sumLogP2 += lp * lp;
    sumLogPlogB += lp * lb;
  }
  const slope = (n * sumLogPlogB - sumLogP * sumLogB) / (n * sumLogP2 - sumLogP * sumLogP);
  const intercept = (sumLogB - slope * sumLogP) / n;
  const elasticity = slope;
  let suggestedPrice;
  if (elasticity >= -1) {
    suggestedPrice = valid.reduce((s, e) => s + e.price, 0) / n;
  } else {
    suggestedPrice = Math.exp(intercept) * Math.pow(-1 / (elasticity + 1), 1 / elasticity);
  }
  if (!Number.isFinite(suggestedPrice)) {
    suggestedPrice = valid.reduce((s, e) => s + e.price, 0) / n;
  }
  suggestedPrice = Math.max(1, Math.round(suggestedPrice));
  let confidence;
  if (n < 3) confidence = 'low';
  else if (n < 10) confidence = 'medium';
  else confidence = 'high';
  return { suggestedPrice, confidence };
}
module.exports = { optimizePackagePrice };
