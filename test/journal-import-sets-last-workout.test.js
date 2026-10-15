'use strict';

// Regression: importing a TH1 result code on journal.html stored the plan the
// trainee ran only as c.lastPlan. «פתח כמתאמן» / «שתף אימון ללקוח» read
// c.lastWorkout (falling back to the coach's own active workout), so right after
// the coach imported «אימון ליבה» the preview opened whatever the coach had built
// last («אימון רגליים») and, worse, shareOrPreview then wrote that workout back
// over lastPlan - «הצע שבוע הבא» lost the imported plan too. The import now sets
// lastWorkout together with lastPlan.

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
    doneAt: '2026-10-14T18:00:00.000Z',
    minutes: 20,
    exercises: 2,
    sets: 4,
    skipped: 0,
    rpe: 3,
    plan: TH.compactPlan(w)
  });
}

function planOf(link) {
  const decoded = TH.decodeHash(link.split('#')[1]);
  assert.ok(decoded && decoded.workout, 'the preview link carries a workout');
  return decoded.workout;
}

test('a new client created from a TH1 code is previewed with the plan they ran, not the coach\'s active workout', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const p = loadPage({ active: legs });

  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana' }));
  assert.match(p.$('importStatus').textContent, /יובא ביצוע של דנה/);
  const c = p.clients()[0];
  assert.equal(c.id, 't_dana');
  assert.equal(c.lastPlan.t, 'אימון ליבה');
  assert.ok(c.lastWorkout && Array.isArray(c.lastWorkout.phases), 'the import stores a full workout as well');
  assert.equal(c.lastWorkout.title, 'אימון ליבה');

  p.act('preview', 0);
  const opened = planOf(p.location.href);
  assert.equal(opened.title, 'אימון ליבה');
  assert.equal(opened.phases[1].exercises[0].name, 'פלאנק');
  assert.equal(p.clients()[0].lastPlan.t, 'אימון ליבה', 'the preview must not overwrite the imported plan');
});

test('an existing client whose report names a different plan than the assigned one follows the report everywhere', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const p = loadPage({
    active: legs,
    clients: [{ id: 't_dana', name: 'דנה', phone: '', plan: 'אימון רגליים', logs: [], lastWorkout: legs, lastPlan: TH.compactPlan(legs) }]
  });

  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana' }));
  const c = p.clients()[0];
  assert.equal(c.plan, 'אימון ליבה');
  assert.equal(c.lastWorkout.title, 'אימון ליבה');

  p.act('preview', 0);
  assert.equal(planOf(p.location.href).title, 'אימון ליבה');

  p.act('next', 0);
  const next = p.clients()[0];
  assert.match(next.lastPlan.t, /^אימון ליבה · שבוע הבא$/);
  assert.equal(next.lastWorkout.title, next.lastPlan.t, '«הצע שבוע הבא» and the preview describe the same plan');
});

test('a duplicate report changes nothing', function () {
  const legs = workout('אימון רגליים', 'סקוואט');
  const core = workout('אימון ליבה', 'פלאנק');
  const p = loadPage({
    active: legs,
    clients: [{
      id: 't_dana', name: 'דנה', phone: '', plan: 'אימון רגליים',
      logs: [{ at: '2026-10-14T18:00:00.000Z', title: 'אימון ליבה' }],
      lastWorkout: legs, lastPlan: TH.compactPlan(legs)
    }]
  });

  p.importCode(resultCode(core, { name: 'דנה', tid: 't_dana' }));
  assert.match(p.$('importStatus').textContent, /כבר קיימת/);
  const c = p.clients()[0];
  assert.equal(c.lastWorkout.title, 'אימון רגליים');
  assert.equal(c.lastPlan.t, 'אימון רגליים');
  assert.equal(c.logs.length, 1);
});
