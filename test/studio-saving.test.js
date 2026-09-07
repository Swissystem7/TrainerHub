const test = require('node:test');
const assert = require('node:assert/strict');
const { WorkoutLibrary } = require('../frontend/saved-workouts.js');
const { NetanyaOpeningWorkouts: plans } = require('../frontend/netanya-opening.js');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');
const TH = require('../js/core.js');

test('five Netanya plans preserve timed blocks, source and location instructions', () => {
  assert.equal(plans.length, 5);
  assert.equal(new Set(plans.map(w => w.saved_id)).size, 5);
  for (const w of plans) {
    assert.equal(w.duration_minutes, 85);
    assert.equal(w.phases.length, 3);
    for (const phase of w.phases) {
      assert.equal(phase.exercises.reduce((s,e) => s + e.duration_seconds, 0), phase.duration_minutes * 60);
    }
    assert.match(w.phases[0].exercises[0].notes, /נקודת פינוי/);
    assert.match(w.notes, /תנאי השטח לא נבדקו/);
    assert.ok(w.source_text);
  }
});
test('batch save survives readback, preserves old records and is idempotent', () => {
  let value = Array.from({length: 25}, (_,i) => ({title: 'old '+i}));
  const store = {get: () => structuredClone(value), set: (k,v) => {value = structuredClone(v); return true;}};
  WorkoutLibrary.save(store, 'test', plans);
  WorkoutLibrary.save(store, 'test', plans);
  assert.equal(value.length, 30);
  assert.deepEqual(value.slice(0,5).map(w=>w.phases), plans.map(w=>w.phases));
});
test('failed storage is reported and never claims a successful save', () => {
  assert.throws(() => WorkoutLibrary.save({get:()=>[],set:()=>false}, 'test', plans), /השמירה נכשלה/);
  assert.throws(() => WorkoutLibrary.save({get:()=>({}),set:()=>true}, 'test', plans), /אינה תקינה/);
});
test('a cached legacy storage writer with no return value is verified by readback', () => {
  let value = [];
  const store = {get:()=>structuredClone(value),set:(key,data)=>{value=structuredClone(data);}};
  WorkoutLibrary.save(store, 'test', plans);
  assert.equal(value.length,5);
});
test('storage verifies persistence and handles quota exceptions', () => {
  global.localStorage = {setItem:()=>{throw Error('QuotaExceededError');}};
  assert.equal(TH.store.set('test', plans), false);
  global.localStorage = {setItem:()=>{},getItem:()=>null};
  assert.equal(TH.store.set('test', plans), false);
  delete global.localStorage;
});
test('Hebrew conjunctions do not split instructions into phantom timed exercises', () => {
  const w = parseWorkoutClient('אימון, 85 דקות\nחימום 30 דקות: פתיחה ותדריך 600 שניות, ארגון וגבולות 600 שניות, תנועה 600 שניות\nעיקר 45 דקות\nמשימת צוות 1200 שניות — העברת חפץ בין תחנות קונוסים\nמים 300 שניות\nמשחק 1200 שניות\nשחרור 10 דקות: סיכום ומתיחות 600 שניות');
  assert.equal(w.duration_minutes,85);
  assert.equal(w.phases[0].exercises.length,3);
  assert.equal(w.phases[1].exercises.length,3);
  assert.equal(w.phases[2].exercises.length,1);
});
