'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Pacer = require('../js/breath-pacer.js');

const root = path.join(__dirname, '..');
const workoutHtml = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');

test('workout mode html includes breath pacer script and panel', () => {
  assert.ok(workoutHtml.includes('breath-pacer.js'));
  assert.ok(workoutHtml.includes('breathPacerPanel'));
});

test('breath pacer inhale phase for seconds 0 to 3', () => {
  const r0 = Pacer.getBreathCyclePhase(0);
  assert.equal(r0.phase, 'שאיפה 4 שניות');
  assert.equal(r0.remainingInPhase, 4);

  const r3 = Pacer.getBreathCyclePhase(3);
  assert.equal(r3.phase, 'שאיפה 4 שניות');
  assert.equal(r3.remainingInPhase, 1);
});

test('breath pacer hold phase for seconds 4 to 5', () => {
  const r4 = Pacer.getBreathCyclePhase(4);
  assert.equal(r4.phase, 'החזקה 2 שניות');
  assert.equal(r4.remainingInPhase, 2);

  const r5 = Pacer.getBreathCyclePhase(5);
  assert.equal(r5.phase, 'החזקה 2 שניות');
  assert.equal(r5.remainingInPhase, 1);
});

test('breath pacer exhale phase for seconds 6 to 11', () => {
  const r6 = Pacer.getBreathCyclePhase(6);
  assert.equal(r6.phase, 'נשיפה איטית 6 שניות');
  assert.equal(r6.remainingInPhase, 6);

  const r11 = Pacer.getBreathCyclePhase(11);
  assert.equal(r11.phase, 'נשיפה איטית 6 שניות');
  assert.equal(r11.remainingInPhase, 1);
});

test('breath pacer cyclical transition at 12+ seconds and invalid/negative inputs', () => {
  const r12 = Pacer.getBreathCyclePhase(12);
  assert.equal(r12.phase, 'שאיפה 4 שניות');
  assert.equal(r12.completedCycles, 1);

  const rNeg = Pacer.getBreathCyclePhase(-5);
  assert.equal(rNeg.phase, 'שאיפה 4 שניות');
  assert.equal(rNeg.completedCycles, 0);

  const score = Pacer.calculateRecoveryBreathScore(4);
  assert.equal(score.completedCycles, 4);
  assert.equal(score.score, 40);
  assert.equal(score.label, 'הרפיה טובה');
});

