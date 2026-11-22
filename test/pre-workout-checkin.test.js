const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluatePreWorkoutCheckin, saveCheckinRecord } = require('../js/pre-workout-checkin.js');

test('מוכנות מלאה ללא כאב', () => {
  const workout = { title: 'Test', phases: [{ name: 'main', exercises: [{ name: 'Pushup', sets: 3 }] }] };
  const res = evaluatePreWorkoutCheckin(5, 'none', workout);
  assert.strictEqual(res.energyLevel, 5);
  assert.strictEqual(res.sorenessArea, 'none');
  assert.ok(res.recommendations.length > 0);
  assert.strictEqual(res.adaptedWorkout.phases[0].exercises[0].sets, 3);
});

test('התאמת עומס באנרגיה נמוכה', () => {
  const workout = { title: 'Test Low Energy', phases: [{ name: 'main', exercises: [{ name: 'Squat', sets: 3 }] }] };
  const res = evaluatePreWorkoutCheckin(1, 'none', workout);
  assert.strictEqual(res.energyLevel, 1);
  assert.strictEqual(res.adaptedWorkout.phases[0].exercises[0].sets, 2);
  assert.ok(res.recommendations.some((r) => r.indexOf('אנרגיה נמוכה') !== -1));
});

test('סימון והתאמה לרגישות כתף/ברך', () => {
  const workout = {
    title: 'Soreness Test',
    phases: [
      {
        name: 'main',
        exercises: [
          { name: 'Shoulder Press', sets: 3 },
          { name: 'Squat', sets: 3 }
        ]
      }
    ]
  };
  const res = evaluatePreWorkoutCheckin(4, 'כתף', workout);
  assert.strictEqual(res.sorenessArea, 'כתף');
  assert.ok(res.adaptedWorkout.phases[0].exercises[0].notes.includes('כתף'));
  assert.ok(res.recommendations.some((r) => r.indexOf('איש מקצוע') !== -1));
});

test('שמירה עם try/catch', () => {
  const mockStorage = {
    store: {},
    getItem(key) {
      return this.store[key] || null;
    },
    setItem(key, val) {
      this.store[key] = val;
    }
  };
  const record = { energy: 4, soreness: 'none' };
  const ok = saveCheckinRecord(record, mockStorage);
  assert.strictEqual(ok, true);
  const parsed = JSON.parse(mockStorage.store.trainerhub_checkins);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].energy, 4);
});

test('קיום הפאנלים ב-frontend/workout-mode.html וב-journal.html', () => {
  const fs = require('node:fs');
  const workoutModeHtml = fs.readFileSync('frontend/workout-mode.html', 'utf8');
  const journalHtml = fs.readFileSync('journal.html', 'utf8');
  assert.ok(workoutModeHtml.includes('preWorkoutCheckinPanel'));
  assert.ok(workoutModeHtml.includes('applyCheckinBtn'));
  assert.ok(journalHtml.includes('checkinHistorySection'));
});
