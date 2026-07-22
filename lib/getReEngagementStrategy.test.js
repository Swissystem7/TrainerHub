const test = require('node:test');
const assert = require('node:assert/strict');

const { getReEngagementStrategy } = require('./getReEngagementStrategy');

const activeProfile = {
  id: 'client-1',
  goals: ['strength'],
  lastWorkoutDate: new Date().toISOString(),
  lastLoginDate: new Date().toISOString(),
  totalCompletedWorkouts: 10
};

test('uses the required high-priority strategy when no activity dates exist', () => {
  const result = getReEngagementStrategy({
    ...activeProfile,
    goals: [],
    lastWorkoutDate: null,
    lastLoginDate: null
  });

  assert.equal(result.action, 'send_motivation');
  assert.equal(result.priority, 'high');
  assert.match(result.messageTemplate, /general_fitness/);
});

test('schedules a call when the last workout is more than 14 days old', () => {
  const oldWorkout = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
  const result = getReEngagementStrategy({
    ...activeProfile,
    lastWorkoutDate: oldWorkout
  });

  assert.equal(result.action, 'schedule_call');
  assert.equal(result.priority, 'high');
});

test('returns no action for an active established client', () => {
  assert.deepEqual(getReEngagementStrategy(activeProfile), {
    action: 'no_action',
    messageTemplate: '',
    priority: 'low'
  });
});

test('rejects profiles missing a required field', () => {
  const { id, ...missingId } = activeProfile;
  assert.throws(() => getReEngagementStrategy(missingId), {
    name: 'TypeError',
    message: 'Missing field: id'
  });
});
