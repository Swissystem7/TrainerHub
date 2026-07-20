function optimizeClassPricing(classId, historicalDemand, targetOccupancy) {
  if (!Array.isArray(historicalDemand) || historicalDemand.length === 0) {
    return { error: 'No historical data' };
  }
  if (!Number.isFinite(targetOccupancy) || targetOccupancy <= 0 || targetOccupancy > 1) {
    return { error: 'Invalid targetOccupancy' };
  }
  const validSlots = historicalDemand.filter(slot => {
    const cap = Number.isFinite(slot && slot.capacity) ? Math.max(0, slot.capacity) : 0;
    return cap > 0;
  });
  if (validSlots.length === 0) {
    return { error: 'No historical data' };
  }
  let totalOccupancy = 0;
  let totalPrice = 0;
  let totalFilled = 0;
  let totalCapacity = 0;
  let sumPriceFilled = 0;
  let sumPriceSq = 0;
  let sumFilledSq = 0;
  let n = 0;
  for (const slot of validSlots) {
    const cap = Math.max(0, slot.capacity);
    const price = Number.isFinite(slot.price) ? Math.max(0, slot.price) : 0;
    const filled = Number.isFinite(slot.filledSeats) ? Math.min(cap, Math.max(0, slot.filledSeats)) : 0;
    const occ = filled / cap;
    totalOccupancy += occ;
    totalPrice += price;
    totalFilled += filled;
    totalCapacity += cap;
    sumPriceFilled += price * filled;
    sumPriceSq += price * price;
    sumFilledSq += filled * filled;
    n++;
  }
  const avgOccupancy = totalOccupancy / n;
  const avgPrice = totalPrice / n;
  const avgFilled = totalFilled / n;
  const numerator = sumPriceFilled - n * avgPrice * avgFilled;
  const denominator = sumPriceSq - n * avgPrice * avgPrice;
  let priceElasticity = 0;
  if (denominator !== 0 && avgFilled !== 0) {
    const slope = numerator / denominator;
    priceElasticity = slope * (avgPrice / avgFilled);
  }
  const currentRevenue = validSlots.reduce((sum, slot) => {
    const cap = Math.max(0, slot.capacity);
    const price = Number.isFinite(slot.price) ? Math.max(0, slot.price) : 0;
    const filled = Number.isFinite(slot.filledSeats) ? Math.min(cap, Math.max(0, slot.filledSeats)) : 0;
    return sum + price * filled;
  }, 0);
  const currentAvgPrice = totalPrice / n;
  const currentAvgOccupancy = totalFilled / totalCapacity;
  let suggestedPrice = currentAvgPrice;
  if (priceElasticity !== 0 && currentAvgOccupancy > 0 && currentAvgPrice > 0) {
    const ratio = Math.log(targetOccupancy / currentAvgOccupancy) / priceElasticity;
    suggestedPrice = currentAvgPrice * Math.exp(ratio);
  }
  suggestedPrice = Math.max(0, suggestedPrice);
  const expectedOccupancy = priceElasticity !== 0 && currentAvgOccupancy > 0 && currentAvgPrice > 0
    ? Math.min(1, currentAvgOccupancy * Math.exp(priceElasticity * Math.log(suggestedPrice / currentAvgPrice)))
    : targetOccupancy;
  const expectedRevenue = suggestedPrice * expectedOccupancy * totalCapacity;
  return {
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    priceElasticity: Math.round(priceElasticity * 100) / 100
  };
}
module.exports = { optimizeClassPricing };
