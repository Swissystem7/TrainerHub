'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Alerts = require('../js/workout-alerts.js');

const root = path.join(__dirname, '..');
const workoutHtml = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');

test('triggerRestCompleteAlert triggers vibration when available', () => {
  let vibratedPattern = null;
  const mockNav = {
    vibrate(pattern) {
      vibratedPattern = pattern;
      return true;
    }
  };
  const mockWin = {
    matchMedia() {
      return { matches: false };
    }
  };
  const res = Alerts.triggerRestCompleteAlert({ enabled: true }, { window: mockWin, navigator: mockNav });
  assert.equal(res.triggered, true);
  assert.equal(res.vibrated, true);
  assert.deepEqual(vibratedPattern, [200, 100, 200]);
});

test('triggerRestCompleteAlert handles missing vibrate safely', () => {
  const mockNav = {};
  const mockWin = {
    matchMedia() {
      return { matches: false };
    }
  };
  const res = Alerts.triggerRestCompleteAlert({ enabled: true }, { window: mockWin, navigator: mockNav });
  assert.equal(res.triggered, true);
  assert.equal(res.vibrated, false);
});

test('triggerRestCompleteAlert respects reduced-motion preference', () => {
  const mockNav = {
    vibrate() {
      throw new Error('should not vibrate');
    }
  };
  const mockWin = {
    matchMedia() {
      return { matches: true }; // reduced motion on
    }
  };
  const res = Alerts.triggerRestCompleteAlert({ enabled: true }, { window: mockWin, navigator: mockNav });
  assert.equal(res.triggered, false);
  assert.equal(res.reason, 'reduced-motion');
});

test('saveAlertPreferences handles storage errors safely', () => {
  const faultyStorage = {
    setItem() {
      throw new Error('Quota exceeded');
    }
  };
  const ok = Alerts.saveAlertPreferences({ alert: true }, faultyStorage);
  assert.equal(ok, false);

  const workingStore = {
    store: {},
    setItem(k, v) { this.store[k] = v; }
  };
  const ok2 = Alerts.saveAlertPreferences({ alert: true }, workingStore);
  assert.equal(ok2, true);
  assert.match(workingStore.store['trainerhub_alert_prefs'], /alert/);
});

test('loadAlertPreferences handles missing or invalid storage safely', () => {
  assert.deepEqual(Alerts.loadAlertPreferences(null), {});
  const faultyStorage = {
    getItem() {
      throw new Error('Security error');
    }
  };
  assert.deepEqual(Alerts.loadAlertPreferences(faultyStorage), {});
});

test('loadAlertPreferences parses valid stored JSON preferences', () => {
  const workingStore = {
    getItem(k) {
      if (k === 'trainerhub_alert_prefs') {
        return JSON.stringify({ enabled: false, vibratePattern: [100, 50, 100] });
      }
      return null;
    }
  };
  const prefs = Alerts.loadAlertPreferences(workingStore);
  assert.equal(prefs.enabled, false);
  assert.deepEqual(prefs.vibratePattern, [100, 50, 100]);
});

test('prefersReducedMotion returns boolean safely when window is missing or lacks matchMedia', () => {
  assert.equal(Alerts.prefersReducedMotion(null), false);
  const winWithoutMatchMedia = {};
  assert.equal(Alerts.prefersReducedMotion(winWithoutMatchMedia), false);
});

test('initWorkoutAlertsUI sets toggle state and adds event listener when element exists', () => {
  let addedListener = false;
  let changeListener = null;
  const mockToggle = {
    checked: true,
    addEventListener(event, fn) {
      if (event === 'change') {
        addedListener = true;
        changeListener = fn;
      }
    }
  };
  const mockDoc = {
    getElementById(id) {
      if (id === 'fieldAlertToggle') return mockToggle;
      return null;
    }
  };

  const workingStore = {
    store: { 'trainerhub_alert_prefs': JSON.stringify({ enabled: false }) },
    getItem(k) { return this.store[k]; },
    setItem(k, v) { this.store[k] = v; }
  };

  Alerts.initWorkoutAlertsUI(workingStore, mockDoc);
  assert.equal(mockToggle.checked, false);
  assert.equal(addedListener, true);
  assert.equal(typeof changeListener, 'function');
  
  mockToggle.checked = true;
  changeListener();
  assert.match(workingStore.store['trainerhub_alert_prefs'], /"enabled":true/);
});
