const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildRuckingProgression } = require('../js/rucking-planner.js');

test('buildRuckingProgression calculates safe initial pack weight at 10% of body weight', () => {
  const plan = buildRuckingProgression(80, 30, 1);
  assert.ok(plan);
  assert.equal(plan.bodyWeightKg, 80);
  assert.equal(plan.weekNumber, 1);
  assert.equal(plan.packWeightMinKg, 8);
  assert.equal(plan.packWeightMaxKg, 12);
  assert.equal(plan.packWeightKg, 8);
  assert.equal(plan.targetMinutes, 30);
  assert.match(plan.safetyNote, /גב/);
  assert.match(plan.safetyNote, /ברכיים/);
});

test('buildRuckingProgression progresses time by up to 10% per week to week 3', () => {
  const plan = buildRuckingProgression(80, 30, 3);
  assert.ok(plan);
  assert.equal(plan.weekNumber, 3);
  assert.equal(plan.targetMinutes, 36);
  assert.ok(plan.packWeightKg > 8);
  assert.ok(plan.packWeightKg <= plan.packWeightMaxKg);
  assert.equal(plan.weeks.length, 3);
  assert.equal(plan.weeks[0].targetMinutes, 30);
  assert.equal(plan.weeks[1].targetMinutes, 33);
  assert.equal(plan.weeks[2].targetMinutes, 36);
});

test('buildRuckingProgression caps pack weight and minutes at maximum safe load', () => {
  const plan = buildRuckingProgression(80, 30, 20);
  assert.ok(plan);
  assert.ok(plan.packWeightKg <= 12);
  assert.equal(plan.packWeightKg, 12);
  assert.ok(plan.targetMinutes <= 120);
  assert.equal(plan.targetMinutes, 120);
  assert.equal(plan.isCapped, true);
  const heavy = buildRuckingProgression(100, 60, 12);
  assert.ok(heavy.packWeightKg <= 15);
  assert.ok(heavy.targetMinutes <= 120);
});

test('buildRuckingProgression returns null for null or negative input', () => {
  assert.equal(buildRuckingProgression(null, 30, 1), null);
  assert.equal(buildRuckingProgression(80, null, 1), null);
  assert.equal(buildRuckingProgression(80, 30, null), null);
  assert.equal(buildRuckingProgression(-80, 30, 1), null);
  assert.equal(buildRuckingProgression(80, -30, 1), null);
  assert.equal(buildRuckingProgression(80, 30, 0), null);
  assert.equal(buildRuckingProgression(0, 30, 1), null);
  assert.equal(buildRuckingProgression('abc', 30, 1), null);
});

test('ruckingPlannerPanel exists with explicit labels in reserves.html and weekly.html', () => {
  const root = path.join(__dirname, '..');
  const reserves = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  const weekly = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
  for (const html of [reserves, weekly]) {
    assert.match(html, /id="ruckingPlannerPanel"/);
    assert.match(html, /for="ruckingBodyWeight"/);
    assert.match(html, /for="ruckingCurrentMinutes"/);
    assert.match(html, /for="ruckingWeekNumber"/);
    assert.match(html, /id="ruckingBodyWeight"/);
    assert.match(html, /id="ruckingCurrentMinutes"/);
    assert.match(html, /id="ruckingWeekNumber"/);
    assert.match(html, /createElement/);
    assert.match(html, /textContent/);
    assert.match(html, /rucking-planner\.js/);
    assert.match(html, /THRucking|buildRuckingProgression/);
  }
});
