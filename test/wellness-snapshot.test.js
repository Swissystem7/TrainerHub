const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildWellnessSnapshot, saveWellnessSnapshot } = require('../js/wellness-snapshot.js');

test('TR-AUTO-067: optimal status when sleep >= 7 and energy >= 4', () => {
  const snap = buildWellnessSnapshot(8, 5);
  assert.equal(snap.status, 'optimal');
  assert.ok(snap.recommendation.length > 0);
});

test('TR-AUTO-067: reduce_load status when sleep < 6 or energy <= 2', () => {
  const snap1 = buildWellnessSnapshot(5, 3);
  assert.equal(snap1.status, 'reduce_load');

  const snap2 = buildWellnessSnapshot(7, 2);
  assert.equal(snap2.status, 'reduce_load');
});

test('TR-AUTO-067: energy rating clamping between 1 and 5 and sleep between 0 and 14', () => {
  const snapLow = buildWellnessSnapshot(-2, 0);
  assert.equal(snapLow.avgSleepHours, 0);
  assert.equal(snapLow.energyRating, 1);

  const snapHigh = buildWellnessSnapshot(20, 10);
  assert.equal(snapHigh.avgSleepHours, 14);
  assert.equal(snapHigh.energyRating, 5);
});

test('TR-AUTO-067: saveWellnessSnapshot handles storage errors gracefully', () => {
  const badStorage = {
    setItem() {
      throw new Error('Quota exceeded');
    }
  };
  const snap = buildWellnessSnapshot(7, 3);
  const ok = saveWellnessSnapshot(snap, badStorage);
  assert.equal(ok, false);

  const mockStore = {
    data: {},
    setItem(k, v) { this.data[k] = v; },
    getItem(k) { return this.data[k]; }
  };
  const ok2 = saveWellnessSnapshot(snap, mockStore);
  assert.equal(ok2, true);
  assert.ok(mockStore.getItem('trainerhub_wellness_weekly'));
});

test('TR-AUTO-067: weekly.html and journal.html contain wellness snapshot panel and explicit labels', () => {
  const weeklyHtml = fs.readFileSync(path.join(__dirname, '../weekly.html'), 'utf8');
  assert.ok(weeklyHtml.includes('wellnessSnapshotPanel'));
  assert.ok(weeklyHtml.includes('journalWellnessSleep'));
  assert.ok(weeklyHtml.includes('journalWellnessEnergy'));

  const journalHtml = fs.readFileSync(path.join(__dirname, '../journal.html'), 'utf8');
  assert.ok(journalHtml.includes('wellnessSnapshotPanel'));
  assert.ok(journalHtml.includes('journalWellnessSleep'));
  assert.ok(journalHtml.includes('journalWellnessEnergy'));
});
