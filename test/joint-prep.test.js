const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getJointPrepChecks, resolvePrepCheckOutcome } = require('../js/joint-prep.js');

const root = path.join(__dirname, '..');
const workoutModeHtml = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
const exercisesHtml = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

test('התאמת בדיקות לפלג גוף עליון מחזירה 3 תנועות ממוקדות כתף', () => {
  const upperChecks = getJointPrepChecks(['chest', 'shoulders']);
  assert.equal(upperChecks.length, 3);
  for (const c of upperChecks) {
    assert.equal(c.joint, 'shoulder');
    assert.equal(c.jointHe, 'כתף');
    assert.ok(c.name);
    assert.ok(c.instruction);
  }

  const hebrewUpperChecks = getJointPrepChecks(['חזה', 'כתפיים']);
  assert.equal(hebrewUpperChecks.length, 3);
  assert.equal(hebrewUpperChecks[0].joint, 'shoulder');
});

test('התאמת בדיקות לרגליים מחזירה 3 תנועות ממוקדות ברך', () => {
  const legChecks = getJointPrepChecks(['legs']);
  assert.equal(legChecks.length, 3);
  for (const c of legChecks) {
    assert.equal(c.joint, 'knee');
    assert.equal(c.jointHe, 'ברך');
    assert.ok(c.name);
    assert.ok(c.instruction);
  }

  const hebrewLegChecks = getJointPrepChecks(['רגליים']);
  assert.equal(hebrewLegChecks.length, 3);
  assert.equal(hebrewLegChecks[0].joint, 'knee');
});

test('המלצת התאמת טווח בדיווח אי-נוחות לעומת אימון מלא', () => {
  const outcomeDiscomfort = resolvePrepCheckOutcome([{ id: 'shoulder-rotations', discomfort: true }]);
  assert.equal(outcomeDiscomfort.adjustRom, true);
  assert.equal(outcomeDiscomfort.safeRangeOfMotion, true);
  assert.match(outcomeDiscomfort.recommendation, /טווח תנועה בטוחה/);
  assert.match(outcomeDiscomfort.message, /אי-נוחות/);

  const outcomeString = resolvePrepCheckOutcome('discomfort');
  assert.equal(outcomeString.adjustRom, true);

  const outcomeObject = resolvePrepCheckOutcome({ discomfort: true });
  assert.equal(outcomeObject.adjustRom, true);

  const outcomeClean = resolvePrepCheckOutcome([{ id: 'bodyweight-squat-check', discomfort: false }]);
  assert.equal(outcomeClean.adjustRom, false);
  assert.equal(outcomeClean.safeRangeOfMotion, false);
  assert.match(outcomeClean.recommendation, /מעבר לאימון מלא/);
});

test('קלט null מטופל בבטחה בשתי הפונקציות', () => {
  const nullChecks = getJointPrepChecks(null);
  assert.ok(Array.isArray(nullChecks));
  assert.equal(nullChecks.length, 3);
  const joints = nullChecks.map((c) => c.joint);
  assert.ok(joints.includes('shoulder'));
  assert.ok(joints.includes('knee'));
  assert.ok(joints.includes('back'));

  const undefinedChecks = getJointPrepChecks(undefined);
  assert.equal(undefinedChecks.length, 3);

  const emptyChecks = getJointPrepChecks([]);
  assert.equal(emptyChecks.length, 3);

  const nullOutcome = resolvePrepCheckOutcome(null);
  assert.ok(nullOutcome);
  assert.equal(nullOutcome.adjustRom, false);
  assert.match(nullOutcome.recommendation, /מעבר לאימון מלא/);

  const undefinedOutcome = resolvePrepCheckOutcome(undefined);
  assert.equal(undefinedOutcome.adjustRom, false);
});

test('קיום הפאנל ב-frontend/workout-mode.html וב-exercises.html', () => {
  // frontend/workout-mode.html
  assert.match(workoutModeHtml, /id="jointPrepPanel"/);
  assert.match(workoutModeHtml, /id="confirmJointPrepBtn"/);
  assert.match(workoutModeHtml, /<script[^>]*src="[^"]*joint-prep\.js"[^>]*><\/script>/);
  assert.match(workoutModeHtml, /THJointPrep\.getJointPrepChecks/);
  assert.match(workoutModeHtml, /THJointPrep\.resolvePrepCheckOutcome/);

  // exercises.html
  assert.match(exercisesHtml, /id="exerciseJointPrepHint"/);
  assert.match(exercisesHtml, /<script[^>]*src="[^"]*joint-prep\.js"[^>]*><\/script>/);
  assert.match(exercisesHtml, /THJointPrep\.getJointPrepChecks/);
});
