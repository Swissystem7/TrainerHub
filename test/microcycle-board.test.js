const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const board = require('../js/microcycle-board.js');

const root = path.join(__dirname, '..');
const _weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const _reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');

test('shiftWorkoutDay correctly swaps two days and re-indexes', () => {
  const schedule = {
    dailyWorkouts: [
      { day: 1, title: 'Day One' },
      { day: 2, title: 'Day Two' }
    ]
  };
  const updated = board.shiftWorkoutDay(schedule, 0, 1);
  assert.equal(updated.dailyWorkouts[0].title, 'Day Two');
  assert.equal(updated.dailyWorkouts[0].day, 1);
  assert.equal(updated.dailyWorkouts[1].title, 'Day One');
  assert.equal(updated.dailyWorkouts[1].day, 2);
});

test('shiftWorkoutDay preserves other days unchanged when index is invalid', () => {
  const schedule = {
    dailyWorkouts: [
      { day: 1, title: 'A' },
      { day: 2, title: 'B' }
    ]
  };
  const updated = board.shiftWorkoutDay(schedule, 0, 99);
  assert.equal(updated.dailyWorkouts[0].title, 'A');
  assert.equal(updated.dailyWorkouts[1].title, 'B');
});

test('insertActiveRecoveryDay adds a recovery day at specified index and re-indexes', () => {
  const schedule = {
    dailyWorkouts: [
      { day: 1, title: 'Push' },
      { day: 2, title: 'Pull' }
    ]
  };
  const updated = board.insertActiveRecoveryDay(schedule, 1);
  assert.equal(updated.dailyWorkouts.length, 3);
  assert.equal(updated.dailyWorkouts[1].title, 'התאוששות אקטיבית');
  assert.equal(updated.dailyWorkouts[1].day, 2);
  assert.equal(updated.dailyWorkouts[2].title, 'Pull');
  assert.equal(updated.dailyWorkouts[2].day, 3);
});

test('board handles null or invalid schedule gracefully without throwing', () => {
  const res1 = board.shiftWorkoutDay(null, 0, 1);
  assert.equal(res1, null);
  const res2 = board.insertActiveRecoveryDay({ dailyWorkouts: null }, 0);
  assert.deepEqual(res2.dailyWorkouts, null);
});

test('microcycle board module exports initMicrocycleBoard', () => {
  assert.equal(typeof board.initMicrocycleBoard, 'function');
});
