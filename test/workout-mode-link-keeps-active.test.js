'use strict';

// The journal's «פתח כמתאמן» and shared clips open workout-mode with a #TH. /
// CLIP. hash. loadWorkout() takes the workout from the hash, but exitWorkout()
// and finishWorkout() still removed TH.KEYS.active, so previewing a trainee's
// plan wiped the coach's own active workout. Only a workout that was loaded
// from TH.KEYS.active may clear it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name + ' exists in workout-mode.html');
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function exitWith(hash) {
  const active = { title: 'אימון המאמן', phases: [{ exercises: [{ name: 'סקוואט' }] }] };
  const store = { active: active };
  const TH = {
    KEYS: { active: 'active' },
    store: {
      get: function (k, d) { return k in store ? store[k] : d; },
      remove: function (k) { delete store[k]; }
    }
  };
  const ThLink = {
    decodeClipHash: function () { return null; },
    decodeHash: function (h) {
      return h ? { workout: { title: 'אימון מתאמן', phases: [{ exercises: [{ name: 'לאנג׳' }] }] }, name: 'דנה' } : null;
    }
  };
  const window = { location: { href: '' } };
  const run = new Function(
    'TH', 'ThLink', 'location', 'window', 'confirm', 'clearCountdown', 'pauseElapsedTimer',
    "let linkMeta = { wa: '', name: '', tid: '' };\nlet loadedFromActive = false;\n" +
    extract('loadWorkout') + '\n' + extract('exitWorkout') +
    '\nconst w = loadWorkout(); exitWorkout(); return w;'
  );
  const loaded = run(TH, ThLink, { hash: hash }, window, function () { return true; }, function () {}, function () {});
  return { loaded: loaded, store: store };
}

test('exiting a workout opened from a #TH. link keeps the coach\'s active workout', () => {
  const r = exitWith('#TH.abc');
  assert.equal(r.loaded.title, 'אימון מתאמן');
  assert.ok(r.store.active, 'TH.KEYS.active survives');
});

test('exiting the coach\'s own active workout still clears it', () => {
  const r = exitWith('');
  assert.equal(r.loaded.title, 'אימון המאמן');
  assert.equal(r.store.active, undefined);
});

test('finishWorkout clears TH.KEYS.active only for a workout loaded from it', () => {
  assert.match(extract('finishWorkout'), /if \(loadedFromActive\) TH\.store\.remove\(TH\.KEYS\.active\)/);
  assert.doesNotMatch(extract('finishWorkout').replace(/if \(loadedFromActive\) TH\.store\.remove\(TH\.KEYS\.active\)/, ''), /TH\.store\.remove\(TH\.KEYS\.active\)/);
});
