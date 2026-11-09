'use strict';

// Same-device flow: workout-mode finish already wrote the set log, then the
// coach pastes that TH1 code into the journal. The import must not store the
// sets a second time (the day volume was 2kg for one 1kg set). Plan progress
// reads the compact lastPlan the report stores, not only a phases-shaped plan.
// A finished session whose every set was skipped is still an imported report
// and marks the day; it does not invent volume.

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
  href: 'https://swissystem7.github.io/TrainerHub/journal.html',
  pathname: '/TrainerHub/journal.html',
  hash: ''
};

const TH = require('../js/core.js');
const Journal = require('../js/journal-storage.js');
const Tracker = require('../js/session-tracker.js');
TH.setCatalog({});

const page = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');

function inlineScript() {
  const open = page.lastIndexOf('<script>');
  const close = page.indexOf('</script>', open);
  return page.slice(open + '<script>'.length, close);
}

function el(id) {
  return {
    id: id,
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    disabled: false,
    hidden: false,
    listeners: {},
    addEventListener: function (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    fire: function (type, evt) {
      const e = Object.assign({ preventDefault: function () {} }, evt || {});
      (this.listeners[type] || []).forEach(function (fn) { fn(e); });
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
}

function workout() {
  return {
    title: 'אימון 1',
    duration_minutes: 38,
    intensity: 'high',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'מעגלי ידיים', id: 'arm_circles', sets: 1, duration_seconds: 180 }] },
      { name: 'Main', exercises: [{ name: 'שכיבות סמיכה', id: 'push_up', sets: 4, reps: '4-6', rest_seconds: 120 }] },
      { name: 'Cool-down', exercises: [{ name: 'מתיחת מיתר', id: 'hamstring_stretch', sets: 1, duration_seconds: 180 }] }
    ]
  };
}

function loadPage(opts) {
  if (!opts || !opts.keep) Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const byId = {};
  const $ = function (id) {
    if (!byId[id]) byId[id] = el(id);
    return byId[id];
  };
  const run = new Function('document', 'TH', 'location', 'window', inlineScript());
  run({ getElementById: $ }, TH, { href: '' }, {
    open: function () {},
    THJournalStorage: Journal,
    THSessionTracker: Tracker
  });
  return {
    $: $,
    importCode: function (code) {
      $('importCode').value = code;
      $('importForm').fire('submit');
    }
  };
}

function resultCode(meta) {
  return TH.encodeResult({
    name: meta.name,
    tid: meta.tid,
    title: 'אימון 1',
    doneAt: meta.doneAt,
    minutes: meta.minutes || 0,
    exercises: meta.exercises,
    sets: meta.sets,
    skipped: meta.skipped || 0,
    rpe: meta.rpe != null ? meta.rpe : 3,
    plan: TH.compactPlan(workout()),
    log: meta.log || []
  });
}

test('importing a code the finish screen already saved keeps one 1kg set and counts it on the plan', function () {
  const doneAt = new Date().toISOString();
  const p = loadPage();
  Journal.saveEntry({
    clientId: 't_check',
    title: 'אימון 1',
    doneAt: doneAt,
    sets: [{ exerciseId: 'push_up', reps: 1, weightKg: 1 }]
  });
  p.$('insClient').value = 't_check';
  p.importCode(resultCode({
    name: 'בדיקת שמירה',
    tid: 't_check',
    doneAt: doneAt,
    exercises: 2,
    sets: 2,
    skipped: 16,
    log: [{ id: 'push_up', sets: [{ reps: 1, weightKg: 1 }] }]
  }));

  const entries = Journal.listEntries().filter(function (e) { return e.clientId === 't_check'; });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].volume, 1);
  assert.equal(Journal.getClientSnapshot('t_check').progressGraph[0].volume, 1);
  assert.equal(Journal.getPersonalRecords().push_up.weightKg, 1);
  assert.equal(Journal.getPersonalRecords().push_up.reps, 1);
  const c = TH.store.get(TH.KEYS.clients, [])[0];
  assert.equal(c.logs.length, 1);
  assert.equal(c.logs[0].exercises, 2, 'the session summary still records both finished steps');
  assert.equal(c.logs[0].sets, 2);
  assert.equal(c.logs[0].ex.length, 1);
  assert.match(p.$('importStatus').textContent, /פירוט ל-1 תרגילים/);
  assert.match(p.$('insBody').innerHTML, /היום תועדו 1\/3 תרגילים/);
  assert.equal(c.lastPlan.p.length, 3);
});

test('pasting the finish code after autosave does not add a second session and still names the exercise count', function () {
  const doneAt = new Date().toISOString();
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const code = resultCode({
    name: '',
    tid: '',
    doneAt: doneAt,
    exercises: 1,
    sets: 1,
    rpe: null,
    log: [{ id: 'push_up', sets: [{ reps: 1, weightKg: 1 }] }]
  });
  TH.recordFinishedWorkout(TH.decodeResult(code));
  Journal.saveEntry({
    clientId: 't_device',
    title: 'אימון 1',
    doneAt: doneAt,
    sets: [{ exerciseId: 'push_up', reps: 1, weightKg: 1 }]
  });
  const p = loadPage({ keep: true });
  p.importCode(code);
  const clients = TH.store.get(TH.KEYS.clients, []);
  assert.equal(clients.length, 1);
  assert.equal(clients[0].logs.length, 1);
  assert.match(p.$('importStatus').textContent, /כבר קיימת/);
  assert.match(p.$('importStatus').textContent, /פירוט ל-1 תרגילים/);
  assert.equal(Journal.listEntries().filter(function (e) { return e.clientId === 't_device'; }).length, 1);
});

test('a code pasted on a device that has not finished the workout is stored once', function () {
  const doneAt = new Date().toISOString();
  const p = loadPage();
  p.importCode(resultCode({
    name: 'בדיקת שמירה',
    tid: 't_other',
    doneAt: doneAt,
    exercises: 1,
    sets: 1,
    log: [{ id: 'push_up', sets: [{ reps: 1, weightKg: 1 }] }]
  }));
  const entries = Journal.listEntries().filter(function (e) { return e.clientId === 't_other'; });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].volume, 1);
  p.importCode(resultCode({
    name: 'בדיקת שמירה',
    tid: 't_other',
    doneAt: doneAt,
    exercises: 1,
    sets: 1,
    log: [{ id: 'push_up', sets: [{ reps: 1, weightKg: 1 }] }]
  }));
  assert.equal(Journal.listEntries().filter(function (e) { return e.clientId === 't_other'; }).length, 1);
  assert.match(p.$('importStatus').textContent, /כבר קיימת/);
});

test('a fully skipped completion is a logged day and adds no volume', function () {
  const doneAt = new Date().toISOString();
  const p = loadPage();
  p.importCode(resultCode({
    name: 'דילוג',
    tid: 't_skip',
    doneAt: doneAt,
    exercises: 0,
    sets: 0,
    skipped: 18,
    log: []
  }));
  const c = TH.store.get(TH.KEYS.clients, []).filter(function (x) { return x.id === 't_skip'; })[0];
  assert.equal(c.logs.length, 1);
  assert.equal(c.logs[0].exercises, 0);
  assert.equal(c.logs[0].sets, 0);
  assert.equal(Journal.listEntries().filter(function (e) { return e.clientId === 't_skip'; }).length, 0);
  assert.equal(Journal.getClientSnapshot('t_skip').progressGraph.length, 0);
});
