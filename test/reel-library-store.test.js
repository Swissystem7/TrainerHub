'use strict';
// Regression tests for Sentry issue 157802717 (TRAINERHUB-1): ReferenceError: root is not defined in storeOf.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('loads with no TH and no localStorage (Sentry 157802717)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  assert.doesNotThrow(() => api.loadWorkouts());
  assert.ok(Array.isArray(api.loadWorkouts()));
  assert.doesNotThrow(() => api.loadDraft());
  assert.doesNotThrow(() => api.saveDraft(api.emptyDraft()));
  assert.doesNotThrow(() => api.clearDraft());
});

test('explicit store wins', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  const calls = [];
  const store = {
    get(k, f) {
      calls.push(k);
      return [];
    },
    set() {
      return true;
    }
  };
  api.loadWorkouts(store);
  assert.ok(calls.includes('trainerhub_reel_workouts'));
});

test('TH.store on the global is used', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {};
  const calls = [];
  sandbox.TH = {
    store: {
      get(k, f) {
        calls.push(k);
        return [];
      },
      set() {
        return true;
      }
    }
  };
  vm.runInNewContext(src, sandbox);
  sandbox.THReels.loadWorkouts();
  assert.ok(calls.includes('trainerhub_reel_workouts'));
});

test('throwing localStorage falls back', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {
    localStorage: {
      getItem() { throw new Error('x'); },
      setItem() { throw new Error('x'); }
    }
  };
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  assert.strictEqual(JSON.stringify(api.loadWorkouts()), JSON.stringify([]));
  assert.doesNotThrow(() => api.saveWorkouts([]));
});

test('working localStorage round-trips', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const m = new Map();
  const sandbox = {
    localStorage: {
      getItem(k) { return m.has(k) ? m.get(k) : null; },
      setItem(k, v) { m.set(k, String(v)); }
    }
  };
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  api.saveWorkouts([{ id: 'w1', exercises: [] }]);
  const loaded = api.loadWorkouts();
  assert.strictEqual(loaded.length, 1);
  assert.strictEqual(loaded[0].id, 'w1');
});
