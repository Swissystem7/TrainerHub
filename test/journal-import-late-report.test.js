'use strict';

// Regression: importing a TH1 code on journal.html always made the imported
// report's plan the client's current plan. A trainee who sends Monday's code
// after Wednesday's (or a coach who pastes them out of order) ended up with
// Monday's «אימון רגליים» as c.plan / c.lastPlan / c.lastWorkout while the card
// still showed Wednesday as the last session - «פתח כמתאמן» and «שתף» opened the
// old plan, and «הצע שבוע הבא» built next week from Monday's plan using
// Wednesday's report. A late report is now logged without replacing the plan.

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
TH.setCatalog({});

const page = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');

function inlineScript() {
  const open = page.lastIndexOf('<script>');
  const close = page.indexOf('</script>', open);
  assert.ok(open >= 0 && close > open, 'journal.html has an inline script');
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

function workout(title, mainName) {
  return {
    title: title,
    duration_minutes: 20,
    intensity: 'medium',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'חימום', id: 'warmup', sets: 1, reps: null, duration_seconds: 60, rest_seconds: null }] },
      { name: 'Main', exercises: [{ name: mainName, id: null, sets: 3, reps: '10', duration_seconds: null, rest_seconds: 45 }] }
    ]
  };
}

/** Load the page against a fresh localStorage; returns helpers. */
function loadPage(opts) {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  if (opts.active) TH.store.set(TH.KEYS.active, opts.active);
  if (opts.clients) TH.store.set(TH.KEYS.clients, opts.clients);
  const byId = {};
  const $ = function (id) {
    if (!byId[id]) byId[id] = el(id);
    return byId[id];
  };
  const loc = { href: '' };
  const run = new Function('document', 'TH', 'location', 'window', inlineScript());
  run({ getElementById: $ }, TH, loc, { open: function () {} });
  return {
    $: $,
    location: loc,
    clients: function () { return TH.store.get(TH.KEYS.clients, []); },
    importCode: function (code) {
      $('importCode').value = code;
      $('importForm').fire('submit');
    },
    /** Click a data-act button on the card of the i-th client. */
    act: function (name, i) {
      const btn = {
        getAttribute: function (a) { return a === 'data-act' ? name : (a === 'data-i' ? String(i) : null); },
        closest: function () { return null; }
      };
      $('list').fire('click', { target: { closest: function () { return btn; } } });
    }
  };
}

/** The code the trainee copies from the workout-mode finish screen. */
function resultCode(w, meta) {
  return TH.encodeResult({
    name: meta.name,
    tid: meta.tid,
    title: w.title,
    doneAt: meta.doneAt || '2026-10-14T18:00:00.000Z',
    minutes: 20,
    exercises: 2,
    sets: 4,
    skipped: 0,
    rpe: 3,
    plan: TH.compactPlan(w)
  });
}


test('a late report is logged but does not replace the plan from a newer report', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const p = loadPage({ active: legs });

  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-14T18:00:00.000Z' }));
  p.importCode(resultCode(legs, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-12T18:00:00.000Z' }));

  assert.match(p.$('importStatus').textContent, /יובא ביצוע של דנה/);
  const c = p.clients()[0];
  assert.equal(c.logs.length, 2, 'the late report is still in the log');
  assert.equal(c.plan, 'אימון ליבה');
  assert.equal(c.lastPlan.t, 'אימון ליבה');
  assert.equal(c.lastWorkout.title, 'אימון ליבה');
});

test('a late report keeps a plan the coach assigned after the newest report', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const back = workout('אימון גב', 'חתירה');
  const p = loadPage({ active: back });

  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-14T18:00:00.000Z' }));
  p.act('assign', 0);
  assert.equal(p.clients()[0].lastPlan.t, 'אימון גב');

  p.importCode(resultCode(legs, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-12T18:00:00.000Z' }));
  const c = p.clients()[0];
  assert.equal(c.plan, 'אימון גב');
  assert.equal(c.lastPlan.t, 'אימון גב');
  assert.equal(c.lastWorkout.title, 'אימון גב');
});

test('a late report does not reopen «הצע שבוע הבא» for the newest report', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const p = loadPage({ active: legs });

  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-14T18:00:00.000Z' }));
  p.act('next', 0);
  const once = p.clients()[0].lastPlan;

  p.importCode(resultCode(legs, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-12T18:00:00.000Z' }));
  p.act('next', 0);
  assert.match(p.$('importStatus').textContent, /כבר הוחלה/);
  assert.deepEqual(p.clients()[0].lastPlan, once);
});

test('a newer report still replaces the plan', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const p = loadPage({ active: legs });

  p.importCode(resultCode(legs, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-12T18:00:00.000Z' }));
  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana', doneAt: '2026-10-14T18:00:00.000Z' }));
  const c = p.clients()[0];
  assert.equal(c.plan, 'אימון ליבה');
  assert.equal(c.lastPlan.t, 'אימון ליבה');
  assert.equal(c.lastWorkout.title, 'אימון ליבה');
});
