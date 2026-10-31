'use strict';

// Regression: the finish screen shows the TH1 code before the trainee picks a
// difficulty, and rebuilds the same code (same doneAt and title) once they do.
// A trainee who sent the code, then tapped «קושי 5» and sent it again, had the
// second code refused as «הרשומה כבר קיימת ביומן», so the log kept rpe null and
// «הצע שבוע הבא» treated a too-hard session as a normal one. A resent code now
// fills in the difficulty of the log it repeats.

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

function resultCode(w, rpe) {
  return TH.encodeResult({
    name: 'דנה',
    tid: 't_dana',
    title: w.title,
    doneAt: '2026-10-14T18:00:00.000Z',
    minutes: 20,
    exercises: 2,
    sets: 4,
    skipped: 0,
    rpe: rpe,
    plan: TH.compactPlan(w)
  });
}

const dana = { id: 't_dana', name: 'דנה', phone: '', plan: 'טרם שויכה תוכנית', logs: [] };

test('a code resent with a difficulty updates the logged session', function () {
  const p = loadPage({ clients: [Object.assign({}, dana)] });
  const w = workout('אימון רגליים', 'סקוואט');
  p.importCode(resultCode(w, null));
  assert.equal(p.clients()[0].logs[0].rpe, null);
  p.importCode(resultCode(w, 5));
  const c = p.clients()[0];
  assert.equal(c.logs.length, 1, 'still one session');
  assert.equal(c.logs[0].rpe, 5);
  assert.equal(p.$('importStatus').textContent, 'עודכן הקושי בביצוע של דנה: 5/5.');
});

test('the same code with the same difficulty is still a duplicate', function () {
  const p = loadPage({ clients: [Object.assign({}, dana)] });
  const w = workout('אימון רגליים', 'סקוואט');
  p.importCode(resultCode(w, 4));
  p.importCode(resultCode(w, 4));
  assert.equal(p.clients()[0].logs.length, 1);
  assert.equal(p.$('importStatus').textContent, 'הרשומה כבר קיימת ביומן.');
});

test('the first code, pasted after the rated one, does not erase the difficulty', function () {
  const p = loadPage({ clients: [Object.assign({}, dana)] });
  const w = workout('אימון רגליים', 'סקוואט');
  p.importCode(resultCode(w, 5));
  p.importCode(resultCode(w, null));
  assert.equal(p.clients()[0].logs[0].rpe, 5);
  assert.equal(p.$('importStatus').textContent, 'הרשומה כבר קיימת ביומן.');
});

test('«הצע שבוע הבא» reads the difficulty that arrived with the resent code', function () {
  const p = loadPage({ clients: [Object.assign({}, dana)] });
  const w = workout('אימון רגליים', 'סקוואט');
  p.importCode(resultCode(w, null));
  p.importCode(resultCode(w, 5));
  const c = p.clients()[0];
  const expected = TH.suggestNextFromLog(c.lastPlan, c.logs[0]);
  p.act('next', 0);
  assert.deepEqual(p.clients()[0].lastPlan, expected.compact);
  assert.notDeepEqual(expected.compact, TH.suggestNextFromLog(c.lastPlan, Object.assign({}, c.logs[0], { rpe: null })).compact,
    'a 5/5 session changes the suggestion');
});
