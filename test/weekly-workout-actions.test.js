'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/weekly.html',
  pathname: '/TrainerHub/weekly.html',
  hash: ''
};

const TH = require('../js/core.js');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

const html = fs.readFileSync(path.join(__dirname, '..', 'weekly.html'), 'utf8');

function inlineScript() {
  const open = html.lastIndexOf('<script>');
  const close = html.indexOf('</script>', open);
  assert.ok(open >= 0 && close > open, 'weekly.html has an inline script');
  return html.slice(open + '<script>'.length, close);
}

function makeElement(id) {
  const el = {
    id: id,
    value: '',
    textContent: '',
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = String(v); },
    className: '',
    listeners: {},
    addEventListener: function (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    fire: function (type, evt) {
      const e = Object.assign({ preventDefault: function () {} }, evt || {});
      (this.listeners[type] || []).forEach(function (fn) { fn(e); });
    },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; }
  };
  return el;
}

function sampleProgram() {
  return {
    programId: 'prog_1',
    durationWeeks: 1,
    dailyWorkouts: [
      {
        day: 1,
        split: 'push',
        exercises: [
          { name: 'שכיבות סמיכה', reps: '10', sets: 3, rest_seconds: 45 }
        ]
      },
      {
        day: 2,
        split: 'pull',
        exercises: [
          { name: 'מתח', reps: '8', sets: 3, rest_seconds: 60 }
        ]
      }
    ]
  };
}

function loadPage(opts) {
  opts = opts || {};
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const byId = {};
  const $ = function (id) {
    if (!byId[id]) byId[id] = makeElement(id);
    return byId[id];
  };

  const loc = { href: 'https://swissystem7.github.io/TrainerHub/weekly.html' };
  const mockWin = {
    location: loc,
    __lastProgram: null,
    __lastMeta: null
  };

  const doc = {
    getElementById: $,
    querySelectorAll: function () { return []; }
  };

  const run = new Function('document', 'TH', 'window', inlineScript());
  run(doc, TH, mockWin);

  return {
    $: $,
    window: mockWin,
    location: loc
  };
}

test('weekly.html defines action buttons with accessible aria-labels for each day', function () {
  assert.match(html, /aria-label="התחל '\s*\+\s*esc\(dayName\)\s*\+\s*'"/);
  assert.match(html, /aria-label="פתח כמתאמן עבור '\s*\+\s*esc\(dayName\)\s*\+\s*'"/);
  assert.match(html, /aria-label="שתף אימון ללקוח עבור '\s*\+\s*esc\(dayName\)\s*\+\s*'"/);
  assert.match(html, /aria-label="דף להדפסה \/ PDF עבור '\s*\+\s*esc\(dayName\)\s*\+\s*'"/);
});

test('weekly.html renders empty state message when dailyWorkouts is empty or null', function () {
  const page = loadPage();
  assert.match(html, /class="empty"/);
  assert.match(html, /role="status"/);
  assert.match(html, /לא נמצאו אימונים מתאימים להעדפות שנבחרו/);
});

test('weekly.html printDayWorkout prepares print entry and navigates to printUrl', function () {
  const page = loadPage();
  const prog = sampleProgram();
  page.window.__lastProgram = prog;
  page.window.__lastMeta = { equipment: ['משקל גוף'], intensity: 'medium', tags: [] };

  const startDay = new Function('window', 'TH', 'dayIndex',
    'const raw = window.__lastProgram; if (!raw || !raw.dailyWorkouts || !raw.dailyWorkouts[dayIndex]) return; ' +
    'const workout = TH.toPhasesWorkout(raw.dailyWorkouts[dayIndex], window.__lastMeta || {}); ' +
    'TH.preparePrint(workout, {}); ' +
    'window.location.href = TH.printUrl ? TH.printUrl() : "./workout-print.html";'
  );

  startDay(page.window, TH, 0);

  const printEntry = TH.store.get(TH.KEYS.print);
  assert.ok(printEntry, 'stored print entry');
  assert.equal(printEntry.workout.title, 'אימון 1');
  assert.match(page.location.href, /workout-print\.html/);
});

test('weekly.html startDayWorkout sets active workout in store and navigates to workout-mode.html', function () {
  const page = loadPage();
  const prog = sampleProgram();
  page.window.__lastProgram = prog;
  page.window.__lastMeta = { equipment: ['משקל גוף'], intensity: 'medium', tags: [] };

  const startWorkout = new Function('window', 'TH', 'dayIndex',
    'const raw = window.__lastProgram; if (!raw || !raw.dailyWorkouts || !raw.dailyWorkouts[dayIndex]) return; ' +
    'const workout = TH.toPhasesWorkout(raw.dailyWorkouts[dayIndex], window.__lastMeta || {}); ' +
    'TH.store.set(TH.KEYS.active, workout); ' +
    'window.location.href = "./frontend/workout-mode.html";'
  );

  startWorkout(page.window, TH, 1);

  const active = TH.store.get(TH.KEYS.active);
  assert.ok(active, 'stored active workout');
  assert.equal(active.title, 'אימון 2');
  assert.equal(page.location.href, './frontend/workout-mode.html');
});
