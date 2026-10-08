const { test } = require('node:test');
const assert = require('node:assert');
const THEngine = require('../js/session-builder.js');

// קבוצה קטנה (2-4 חניכים) או מאגר עם תרגיל יחיד מקבלים תחנה אחת.
// עם תחנה אחת אין בין מה להחליף, אז ההנחיה לא תבקש להחליף תחנה
// ולא תכתוב «1 תחנות».

test('groupPlan: 2-4 trainees get a single station without a switch instruction', () => {
  for (const people of [2, 3, 4]) {
    const plan = THEngine.groupPlan(people, 5);
    assert.ok(plan, 'a group of ' + people + ' still gets a plan');
    assert.strictEqual(plan.stations, 1);
    assert.strictEqual(plan.per_station, people);
    assert.ok(plan.he.startsWith(people + ' חניכים:'), plan.he);
    assert.ok(plan.he.includes('תחנה אחת'), plan.he);
    assert.ok(!plan.he.includes('1 תחנות'), plan.he);
    assert.ok(!plan.he.includes('החליפו תחנה'), plan.he);
  }
});

test('groupPlan: a catalog with one exercise caps the plan at one station', () => {
  const plan = THEngine.groupPlan(10, 1);
  assert.strictEqual(plan.stations, 1);
  assert.strictEqual(plan.per_station, 10);
  assert.ok(plan.he.includes('תחנה אחת'), plan.he);
  assert.ok(!plan.he.includes('החליפו תחנה'), plan.he);
});

test('groupPlan: larger groups keep the multi-station text and the switch instruction', () => {
  const plan = THEngine.groupPlan(12, 6);
  assert.strictEqual(plan.stations, 3);
  assert.strictEqual(plan.per_station, 4);
  assert.ok(plan.he.includes('12 חניכים: 3 תחנות'), plan.he);
  assert.ok(plan.he.includes('עד 4 חניכים בתחנה'), plan.he);
  assert.ok(plan.he.includes('החליפו תחנה בסיום כל סט'), plan.he);

  const five = THEngine.groupPlan(5, 5);
  assert.strictEqual(five.stations, 2);
  assert.ok(five.he.includes('2 תחנות'), five.he);
  assert.ok(five.he.includes('החליפו תחנה'), five.he);
});

test('groupPlan: a single trainee still gets no group plan', () => {
  assert.strictEqual(THEngine.groupPlan(1, 5), null);
  assert.strictEqual(THEngine.groupPlan(0, 5), null);
  assert.strictEqual(THEngine.groupPlan(undefined, 5), null);
});

test('buildSession: a prompt for a trio shows the single-station line', () => {
  const catalog = [
    { id: 'squat', he: 'סקוואט', muscles: ['legs'], equipment: ['none'], file: 'squat.mp4', level: 'beginner' },
    { id: 'lunge', he: 'לאנג׳', muscles: ['legs'], equipment: ['none'], file: 'lunge.mp4', level: 'beginner' },
    { id: 'bridge', he: 'גשר ישבן', muscles: ['legs'], equipment: ['none'], file: 'bridge.mp4', level: 'beginner' },
    { id: 'wallsit', he: 'ישיבת קיר', muscles: ['legs'], equipment: ['wall'], file: 'wallsit.mp4', level: 'beginner' }
  ];
  const built = THEngine.buildSession('אימון רגליים ל-3 חניכים 20 דקות', catalog);
  assert.ok(built.workout, 'a workout is built');
  assert.strictEqual(built.workout.participants, 3);
  assert.ok(built.workout.group_plan, 'a group plan exists for 3 trainees');
  assert.strictEqual(built.workout.group_plan.stations, 1);
  assert.ok(built.workout.group_plan.he.includes('3 חניכים: תחנה אחת'), built.workout.group_plan.he);
  assert.ok(!built.workout.group_plan.he.includes('החליפו תחנה'), built.workout.group_plan.he);
});
