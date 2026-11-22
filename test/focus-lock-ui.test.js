const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { requestScreenWakeLock, computeSessionProgressBar } = require('../js/focus-lock-ui.js');

test('חישוב התקדמות 50%', () => {
  const halfProgress = computeSessionProgressBar(5, 10);
  assert.equal(halfProgress.percent, 50);
  assert.equal(halfProgress.text, 'סט 5 מתוך 10');

  const halfSmall = computeSessionProgressBar(1, 2);
  assert.equal(halfSmall.percent, 50);
  assert.equal(halfSmall.text, 'סט 1 מתוך 2');

  const halfLarge = computeSessionProgressBar(25, 50);
  assert.equal(halfLarge.percent, 50);
  assert.equal(halfLarge.text, 'סט 25 מתוך 50');
});

test('קיטוע גבולות 0-100%', () => {
  const belowZero = computeSessionProgressBar(-3, 10);
  assert.equal(belowZero.percent, 0);

  const aboveHundred = computeSessionProgressBar(15, 10);
  assert.equal(aboveHundred.percent, 100);

  const zeroOfZero = computeSessionProgressBar(0, 0);
  assert.equal(zeroOfZero.percent, 0);

  const negativeTotal = computeSessionProgressBar(5, -10);
  assert.equal(negativeTotal.percent, 0);

  const nonNumeric = computeSessionProgressBar('invalid', 10);
  assert.equal(nonNumeric.percent, 0);

  const exactStart = computeSessionProgressBar(0, 10);
  assert.equal(exactStart.percent, 0);

  const exactEnd = computeSessionProgressBar(10, 10);
  assert.equal(exactEnd.percent, 100);
});

test('הפעלת wakeLock כשזמין', async () => {
  let requestedType = null;
  const mockSentinel = {
    type: 'screen',
    released: false,
    release: async () => {
      mockSentinel.released = true;
    }
  };
  const mockNavigator = {
    wakeLock: {
      request: async (type) => {
        requestedType = type;
        return mockSentinel;
      }
    }
  };

  const sentinel = await requestScreenWakeLock(mockNavigator);
  assert.equal(requestedType, 'screen');
  assert.equal(sentinel, mockSentinel);
  assert.equal(sentinel.released, false);
  await sentinel.release();
  assert.equal(sentinel.released, true);
});

test('fallback בטוח כשאין wakeLock', async () => {
  assert.equal(await requestScreenWakeLock(null), null);
  assert.equal(await requestScreenWakeLock(undefined), null);
  assert.equal(await requestScreenWakeLock({}), null);
  assert.equal(await requestScreenWakeLock({ wakeLock: {} }), null);

  const throwingNavigator = {
    wakeLock: {
      request: async () => {
        throw new Error('NotAllowedError');
      }
    }
  };
  const result = await requestScreenWakeLock(throwingNavigator);
  assert.equal(result, null);
});

test('וקיום המתג והתווית ב-frontend/workout-mode.html וב-reserves.html', () => {
  const workoutHtml = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');
  const reservesHtml = fs.readFileSync(path.join(__dirname, '..', 'reserves.html'), 'utf8');

  assert.match(
    workoutHtml,
    /<input[^>]*type="checkbox"[^>]*id="fieldFocusLockToggle"|<input[^>]*id="fieldFocusLockToggle"[^>]*type="checkbox"/,
    'workout-mode.html must contain checkbox with id fieldFocusLockToggle'
  );
  assert.match(
    workoutHtml,
    /<label[^>]*for="fieldFocusLockToggle"[^>]*>/,
    'workout-mode.html must contain label with for="fieldFocusLockToggle"'
  );
  assert.match(
    workoutHtml,
    /id="sessionProgressReadout"/,
    'workout-mode.html must contain id="sessionProgressReadout"'
  );
  assert.match(workoutHtml, /focus-lock-ui\.js/, 'workout-mode.html must include focus-lock-ui.js');

  assert.match(
    reservesHtml,
    /<input[^>]*type="checkbox"[^>]*id="fieldFocusLockToggle"|<input[^>]*id="fieldFocusLockToggle"[^>]*type="checkbox"/,
    'reserves.html must contain checkbox with id fieldFocusLockToggle'
  );
  assert.match(
    reservesHtml,
    /<label[^>]*for="fieldFocusLockToggle"[^>]*>/,
    'reserves.html must contain label with for="fieldFocusLockToggle"'
  );
  assert.match(reservesHtml, /id="sessionProgressReadout"/, 'reserves.html must contain id="sessionProgressReadout"');
  assert.match(reservesHtml, /focus-lock-ui\.js/, 'reserves.html must include focus-lock-ui.js');
});
