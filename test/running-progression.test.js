'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const RUNNING = require('../js/running-progression.js');

test('1) buildSixWeekRunPlan builds a valid 6-week plan with 3 sessions per week', function () {
  const plan = RUNNING.buildSixWeekRunPlan(13.5);
  assert.equal(plan.baseMinutes, 13.5);
  assert.equal(plan.weeks.length, 6);
  plan.weeks.forEach(function (wk) {
    assert.equal(typeof wk.week, 'number');
    assert.equal(wk.sessions.length, 3);
  });
});

test('2) buildSixWeekRunPlan calculates faster paces for faster 3km times', function () {
  const fastPlan = RUNNING.buildSixWeekRunPlan(10.0);
  const slowPlan = RUNNING.buildSixWeekRunPlan(16.0);
  const fastPace = fastPlan.weeks[0].sessions[0].targetPace;
  const slowPace = slowPlan.weeks[0].sessions[0].targetPace;
  assert.ok(fastPace < slowPace, 'Faster 3km should yield lower/faster minutes per km');
});

test('3) buildSixWeekRunPlan handles negative, zero, or NaN inputs safely with fallback', function () {
  const planNeg = RUNNING.buildSixWeekRunPlan(-3);
  assert.equal(planNeg.baseMinutes, 14.0);
  const planNaN = RUNNING.buildSixWeekRunPlan(NaN);
  assert.equal(planNaN.baseMinutes, 14.0);
  const planInvalid = RUNNING.buildSixWeekRunPlan('abc');
  assert.equal(planInvalid.baseMinutes, 14.0);
});

test('4) mergeRunDaysWithStrength prevents interval training overlap with heavy leg days', function () {
  const plan = RUNNING.buildSixWeekRunPlan(13.5);
  plan.weeks[0].sessions[0].dayHe = 'יום ראשון';
  plan.weeks[0].sessions[0].typeHe = 'אינטרוולים';

  const merged = RUNNING.mergeRunDaysWithStrength(plan, ['יום ראשון']);
  assert.equal(merged.weeks[0].sessions[0].dayHe, 'יום רביעי');
  assert.ok(merged.weeks[0].sessions[0].noteHe);
});

test('5) reserves.html and weekly.html contain required running plan panels, weekly running slots, and script reference', function () {
  const root = path.join(__dirname, '..');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');

  assert.match(reservesHtml, /id=["']runningPlanPanel["']/);
  assert.match(reservesHtml, /id=["']generateRunPlanBtn["']/);
  assert.match(reservesHtml, /running-progression\.js/);
  assert.match(weeklyHtml, /id=["']weeklyRunningSlots["']/);
  assert.match(weeklyHtml, /running-progression\.js/);
});
