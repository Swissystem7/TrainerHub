'use strict';

// Regression: a TH1 code with no tid and no name (the trainee ran a plain link,
// not one shared from a client card) matched no client, so every import opened
// a new «מתאמן» card - pasting the same code twice gave two cards with the same
// session and said «יובא ביצוע» instead of «הרשומה כבר קיימת ביומן». A repeat
// of an anonymous code now finds the card that already logged it.

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


test('pasting the same anonymous code twice keeps one client and reports a duplicate', function () {
  const p = loadPage({});
  const code = resultCode(workout('אימון רגליים', 'סקוואט'), { doneAt: '2026-10-14T18:00:00.000Z' });
  p.importCode(code);
  assert.equal(p.clients().length, 1);
  p.importCode(code);
  const clients = p.clients();
  assert.equal(clients.length, 1, 'no second «מתאמן» card');
  assert.equal(clients[0].logs.length, 1);
  assert.equal(p.$('importStatus').textContent, 'הרשומה כבר קיימת ביומן.');
});

test('a different anonymous session still opens its own card', function () {
  const p = loadPage({});
  p.importCode(resultCode(workout('אימון רגליים', 'סקוואט'), { doneAt: '2026-10-14T18:00:00.000Z' }));
  p.importCode(resultCode(workout('אימון חזה', 'שכיבות סמיכה'), { doneAt: '2026-10-15T18:00:00.000Z' }));
  assert.equal(p.clients().length, 2);
});

test('a named code is still matched by name, not by the anonymous log lookup', function () {
  const p = loadPage({});
  const w = workout('אימון רגליים', 'סקוואט');
  p.importCode(resultCode(w, { doneAt: '2026-10-14T18:00:00.000Z' }));
  p.importCode(resultCode(w, { name: 'דנה', doneAt: '2026-10-14T18:00:00.000Z' }));
  const names = p.clients().map(function (c) { return c.name; }).sort();
  assert.deepEqual(names, ['דנה', 'מתאמן']);
});
