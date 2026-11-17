'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem(k, v) { mem[k] = String(v); },
  removeItem(k) { delete mem[k]; }
};
global.location = { href: 'https://example.test/weekly.html', pathname: '/weekly.html', hash: '' };

const TH = require('../js/core.js');
TH.setCatalog(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8')));

const html = fs.readFileSync(path.join(__dirname, '..', 'weekly.html'), 'utf8');

function inlineScript() {
  const open = html.lastIndexOf('<script>');
  const close = html.indexOf('</script>', open);
  return html.slice(open + '<script>'.length, close);
}

function el() {
  return {
    value: 'none',
    textContent: '',
    innerHTML: '',
    hidden: false,
    listeners: {},
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    insertAdjacentHTML() {}
  };
}

test('swapping an exercise still opens a workout that has exercises', () => {
  Object.keys(mem).forEach((k) => delete mem[k]);
  const ids = {};
  const $ = (id) => {
    if (!ids[id]) ids[id] = el();
    if (id === 'level') ids[id].value = 'beginner';
    if (id === 'goal') ids[id].value = 'strength';
    if (id === 'days') ids[id].value = '2';
    if (id === 'equipment') ids[id].value = 'none';
    if (id === 'muscle') ids[id].value = 'full';
    if (id === 'audience') ids[id].value = 'general';
    if (id === 'periodWeeks') ids[id].value = '0';
    return ids[id];
  };
  const win = { location: { href: '' } };
  const run = new Function('document', 'TH', 'window', inlineScript());
  run({ getElementById: $, querySelector() { return null; }, querySelectorAll() { return []; } }, TH, win);

  const day = {
    day: 1,
    title: 'אימון 1',
    exercises: [{ name: 'שכיבות סמיכה', id: 'push_up', sets: 3, reps: '8-12', rest_seconds: 60 }],
    warmUp: 'arm_circles',
    coolDown: 'hamstring_stretch'
  };
  day.phases = TH.toPhasesWorkout(day, {}).phases;
  win.__lastProgram = { dailyWorkouts: [day] };
  win.__lastMeta = {};

  const swapped = win.applyWeeklySwap(0, 1, 0, 'שכיבות_סמיכה_ורגליים');
  assert.equal(swapped.phases[1].exercises[0].id, 'שכיבות_סמיכה_ורגליים');
  assert.equal(day.exercises[0].name, swapped.phases[1].exercises[0].name);
  assert.equal(day.exercises[0].name, 'שכיבות סמיכה ורגליים');

  win.startDayWorkout(0);
  const active = TH.store.get(TH.KEYS.active, null);
  assert.ok(active, 'active workout was stored');
  assert.match(win.location.href, /workout-mode\.html/);
  const count = (active.phases || []).reduce((n, ph) => n + (ph.exercises || []).filter(Boolean).length, 0);
  assert.ok(count > 0, 'the opened workout still has exercises');
  assert.equal(active.phases[1].exercises[0].id, 'שכיבות_סמיכה_ורגליים');
});

test('a swap that cannot be applied does not wipe the day', () => {
  const day = {
    day: 1,
    exercises: [{ name: 'שכיבות סמיכה', id: 'push_up', sets: 3, reps: '8', rest_seconds: 45 }]
  };
  day.phases = TH.toPhasesWorkout(day, {}).phases;
  const before = day.phases[1].exercises[0].id;
  const win = {
    __lastProgram: { dailyWorkouts: [day] },
    __lastMeta: {},
    applyWeeklySwap: null
  };
  const ids = {};
  const $ = (id) => (ids[id] || (ids[id] = el()));
  const run = new Function('document', 'TH', 'window', inlineScript());
  run({ getElementById: $, querySelector() { return null; }, querySelectorAll() { return []; } }, TH, win);
  win.__lastProgram = { dailyWorkouts: [day] };
  const result = win.applyWeeklySwap(0, 1, 0, 'not-a-real-exercise');
  assert.equal(result.phases[1].exercises[0].id, before);
  assert.ok((day.phases[1].exercises || []).length > 0);
});
