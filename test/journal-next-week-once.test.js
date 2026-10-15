'use strict';

// Regression: «הצע שבוע הבא» on journal.html adjusted c.lastPlan from the client's
// last report every time it was pressed. Nothing recorded that the report had
// already been consumed, so a second press (a double tap, or coming back to the
// page) dropped another set: a hard report took 4 sets to 3 and then to 2, an
// easy report took 3 to 4 and then to 5. The page now remembers which report a
// suggestion came from and applies each (plan, report) pair once; a new report,
// an assigned active workout or a coach-built workout re-enable the button.

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

function workout(title, sets) {
  return {
    title: title,
    duration_minutes: 20,
    intensity: 'medium',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'חימום', id: 'warmup', sets: 1, reps: null, duration_seconds: 60, rest_seconds: null }] },
      { name: 'Main', exercises: [
        { name: 'סקוואט', id: null, sets: sets, reps: '10', duration_seconds: null, rest_seconds: 45 },
        { name: 'פלאנק', id: null, sets: sets, reps: null, duration_seconds: 30, rest_seconds: 30 }
      ] }
    ]
  };
}

function report(at, rpe, skipped) {
  return { at: at, title: 'אימון רגליים', minutes: 20, exercises: 3, sets: 8, skipped: skipped || 0, rpe: rpe };
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
  const run = new Function('document', 'TH', 'location', 'window', inlineScript());
  run({ getElementById: $ }, TH, { href: '' }, { open: function () {} });
  return {
    $: $,
    client: function () { return TH.store.get(TH.KEYS.clients, [])[0]; },
    importCode: function (code) {
      $('importCode').value = code;
      $('importForm').fire('submit');
    },
    /** Click a data-act button on the card of the i-th client. */
    act: function (name, i) {
      const btn = {
        getAttribute: function (a) { return a === 'data-act' ? name : (a === 'data-i' ? String(i || 0) : null); },
        closest: function () { return null; }
      };
      $('list').fire('click', { target: { closest: function () { return btn; } } });
    }
  };
}

function mainSets(c) {
  const main = c.lastPlan.p.filter(function (ph) { return ph.n === 'Main'; })[0];
  return main.e.map(function (ex) { return ex.s; });
}

function clientWith(legs, logs) {
  return { id: 't_dana', name: 'דנה', phone: '', plan: legs.title, logs: logs, lastWorkout: legs, lastPlan: TH.compactPlan(legs) };
}

test('a hard report drops one set once, not once per press', function () {
  const legs = workout('אימון רגליים', 4);
  const p = loadPage({ clients: [clientWith(legs, [report('2026-10-14T18:00:00.000Z', 5)])] });

  p.act('next');
  assert.deepEqual(mainSets(p.client()), [3, 3]);
  assert.match(p.$('importStatus').textContent, /הורדתי סט/);
  assert.equal(p.client().lastPlan.t, 'אימון רגליים · שבוע הבא');

  p.act('next');
  assert.deepEqual(mainSets(p.client()), [3, 3], 'the same report must not drop a second set');
  assert.equal(p.$('importStatus').className, 'status warn');
  assert.match(p.$('importStatus').textContent, /כבר הוחלה/);
  assert.match(p.$('importStatus').textContent, /2026-10-14/);
  assert.equal(p.client().lastPlan.t, 'אימון רגליים · שבוע הבא');
  assert.equal(p.client().lastWorkout.phases[1].exercises[0].sets, 3, 'the preview workout stays in step with the plan');

  // Reloading the page changes nothing: the consumed report is persisted.
  const again = loadPage({ clients: [p.client()] });
  again.act('next');
  assert.deepEqual(mainSets(again.client()), [3, 3]);
});

test('an easy report adds one set once, not once per press', function () {
  const legs = workout('אימון רגליים', 3);
  const p = loadPage({ clients: [clientWith(legs, [report('2026-10-14T18:00:00.000Z', 1)])] });

  p.act('next');
  p.act('next');
  p.act('next');
  assert.deepEqual(mainSets(p.client()), [4, 4]);
});

test('a newer report re-enables the suggestion and adjusts from the suggested plan', function () {
  const legs = workout('אימון רגליים', 4);
  const p = loadPage({ clients: [clientWith(legs, [report('2026-10-14T18:00:00.000Z', 5)])] });

  p.act('next');
  assert.deepEqual(mainSets(p.client()), [3, 3]);

  // The client ran the suggested plan and still found it hard.
  const ran = p.client().lastWorkout;
  p.importCode(TH.encodeResult({
    name: 'דנה', tid: 't_dana', title: ran.title, doneAt: '2026-10-21T18:00:00.000Z',
    minutes: 20, exercises: 3, sets: 6, skipped: 2, rpe: 4, plan: TH.compactPlan(ran)
  }));
  assert.match(p.$('importStatus').textContent, /יובא ביצוע/);

  p.act('next');
  assert.deepEqual(mainSets(p.client()), [2, 2]);
  assert.equal(p.client().lastPlan.t, 'אימון רגליים · שבוע הבא', 'the suffix does not stack');

  p.act('next');
  assert.deepEqual(mainSets(p.client()), [2, 2]);

  // Importing the very same code again is a duplicate and does not re-enable it.
  p.importCode(TH.encodeResult({
    name: 'דנה', tid: 't_dana', title: ran.title, doneAt: '2026-10-21T18:00:00.000Z',
    minutes: 20, exercises: 3, sets: 6, skipped: 2, rpe: 4, plan: TH.compactPlan(ran)
  }));
  assert.match(p.$('importStatus').textContent, /כבר קיימת/);
  p.act('next');
  assert.deepEqual(mainSets(p.client()), [2, 2]);
});

test('assigning the active workout gives the last report one adjustment of the new plan', function () {
  const legs = workout('אימון רגליים', 4);
  const core = workout('אימון ליבה', 3);
  const p = loadPage({ active: core, clients: [clientWith(legs, [report('2026-10-14T18:00:00.000Z', 5)])] });

  p.act('next');
  p.act('next');
  assert.deepEqual(mainSets(p.client()), [3, 3]);

  // «הצע שבוע הבא» also makes the suggestion the coach's active workout; the
  // coach now builds a core workout and assigns it.
  TH.store.set(TH.KEYS.active, core);
  p.act('assign');
  assert.equal(p.client().lastPlan.t, 'אימון ליבה');
  assert.deepEqual(mainSets(p.client()), [3, 3]);

  p.act('next');
  assert.deepEqual(mainSets(p.client()), [2, 2]);
  assert.equal(p.client().lastPlan.t, 'אימון ליבה · שבוע הבא');
  p.act('next');
  assert.deepEqual(mainSets(p.client()), [2, 2]);
});

test('«פתח כמתאמן» after a suggestion does not re-enable it', function () {
  const legs = workout('אימון רגליים', 4);
  const p = loadPage({ clients: [clientWith(legs, [report('2026-10-14T18:00:00.000Z', 5)])] });

  p.act('next');
  p.act('preview');
  p.act('next');
  assert.deepEqual(mainSets(p.client()), [3, 3]);
});

test('without any report the button only labels the plan and never changes volume', function () {
  const legs = workout('אימון רגליים', 4);
  const p = loadPage({ clients: [clientWith(legs, [])] });

  p.act('next');
  p.act('next');
  assert.deepEqual(mainSets(p.client()), [4, 4]);
  assert.equal(p.client().lastPlan.t, 'אימון רגליים · שבוע הבא');
  assert.match(p.$('importStatus').textContent, /השארתי נפח/);
});
