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

test('regression: Sentry 157802717 - ReferenceError: root is not defined', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  assert.ok(api, 'THReels should be attached to root object');
  assert.doesNotThrow(() => {
    api.loadWorkouts();
    api.loadDraft();
    api.saveDraft(api.emptyDraft());
    api.clearDraft();
  });
});

test('globalObj handles undefined root gracefully without throwing ReferenceError', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = { globalThis: undefined };
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  assert.doesNotThrow(() => {
    api.loadWorkouts();
  });
});

test('explicit store wins', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  const calls = [];
  const store = {
    get(k) {
      calls.push(k);
      return [];
    },
    set(k) {
      calls.push(`set:${k}`);
      return true;
    }
  };
  api.loadWorkouts(store);
  api.saveWorkouts([], store);
  assert.ok(calls.includes('trainerhub_reel_workouts'));
  assert.ok(calls.includes('set:trainerhub_reel_workouts'));
});

test('TH.store on the global is used', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {};
  const calls = [];
  sandbox.TH = {
    store: {
      get(k) {
        calls.push(k);
        return [];
      },
      set(k) {
        calls.push(`set:${k}`);
        return true;
      }
    }
  };
  vm.runInNewContext(src, sandbox);
  sandbox.THReels.loadWorkouts();
  sandbox.THReels.saveWorkouts([]);
  assert.ok(calls.includes('trainerhub_reel_workouts'));
  assert.ok(calls.includes('set:trainerhub_reel_workouts'));
});

test('throwing localStorage falls back', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'reel-library.js'), 'utf8');
  const sandbox = {
    localStorage: {
      getItem() {
        throw new Error('x');
      },
      setItem() {
        throw new Error('x');
      }
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
      getItem(k) {
        return m.has(k) ? m.get(k) : null;
      },
      setItem(k, v) {
        m.set(k, String(v));
      }
    }
  };
  vm.runInNewContext(src, sandbox);
  const api = sandbox.THReels;
  api.saveWorkouts([{ id: 'w1', exercises: [] }]);
  const loaded = api.loadWorkouts();
  assert.strictEqual(loaded.length, 1);
  assert.strictEqual(loaded[0].id, 'w1');
});

test('require: no TH and no localStorage uses the memory fallback', () => {
  const reels = require('../js/reel-library.js');
  const oldTH = Object.getOwnPropertyDescriptor(globalThis, 'TH');
  const oldLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    delete globalThis.TH;
    delete globalThis.localStorage;
    assert.ok(Array.isArray(reels.loadWorkouts()));
    assert.doesNotThrow(() => reels.saveDraft(reels.emptyDraft()));
    assert.doesNotThrow(() => reels.clearDraft());
  } finally {
    if (oldTH) Object.defineProperty(globalThis, 'TH', oldTH);
    if (oldLS) Object.defineProperty(globalThis, 'localStorage', oldLS);
  }
});

test('require: globalThis.TH.store is used', () => {
  const reels = require('../js/reel-library.js');
  const oldTH = Object.getOwnPropertyDescriptor(globalThis, 'TH');
  const calls = [];
  try {
    globalThis.TH = {
      store: {
        get(k) {
          calls.push(k);
          return [];
        },
        set(k) {
          calls.push(`set:${k}`);
          return true;
        }
      }
    };
    reels.loadWorkouts();
    reels.saveWorkouts([]);
    assert.ok(calls.includes('trainerhub_reel_workouts'));
    assert.ok(calls.includes('set:trainerhub_reel_workouts'));
  } finally {
    if (oldTH) Object.defineProperty(globalThis, 'TH', oldTH);
    else delete globalThis.TH;
  }
});

test('require: a localStorage getter that throws falls back', () => {
  const reels = require('../js/reel-library.js');
  const oldLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('denied');
      }
    });
    assert.strictEqual(JSON.stringify(reels.loadWorkouts()), '[]');
  } finally {
    if (oldLS) Object.defineProperty(globalThis, 'localStorage', oldLS);
    else delete globalThis.localStorage;
  }
});

test('require: working localStorage round-trips', () => {
  const reels = require('../js/reel-library.js');
  const oldLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const m = new Map();
  try {
    globalThis.localStorage = {
      getItem(k) {
        return m.has(k) ? m.get(k) : null;
      },
      setItem(k, v) {
        m.set(k, String(v));
      }
    };
    reels.saveWorkouts([{ id: 'w2', exercises: [] }]);
    assert.strictEqual(reels.loadWorkouts()[0].id, 'w2');
  } finally {
    if (oldLS) Object.defineProperty(globalThis, 'localStorage', oldLS);
    else delete globalThis.localStorage;
  }
});

test('require: throwing getItem/setItem fall back', () => {
  const reels = require('../js/reel-library.js');
  const oldLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    globalThis.localStorage = {
      getItem() {
        throw new Error('x');
      },
      setItem() {
        throw new Error('x');
      }
    };
    assert.strictEqual(JSON.stringify(reels.loadWorkouts()), '[]');
    assert.doesNotThrow(() => reels.saveWorkouts([]));
  } finally {
    if (oldLS) Object.defineProperty(globalThis, 'localStorage', oldLS);
    else delete globalThis.localStorage;
  }
});
