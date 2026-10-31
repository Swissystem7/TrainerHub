'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
const opened = [];
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
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

const html = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');

function inlineScript() {
  const open = html.lastIndexOf('<script>');
  const close = html.indexOf('</script>', open);
  assert.ok(open >= 0 && close > open, 'journal.html has an inline script');
  return html.slice(open + '<script>'.length, close);
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

function sampleWorkout(title) {
  return {
    title: title || 'אימון ליבה',
    duration_minutes: 20,
    intensity: 'medium',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'חימום', id: 'warmup', sets: 1, reps: null, duration_seconds: 60, rest_seconds: null }] },
      { name: 'Main', exercises: [
        { name: 'סקוואט', id: 'bodyweight_squat', sets: 3, reps: '10', duration_seconds: null, rest_seconds: 45 }
      ] }
    ]
  };
}

function loadPage(opts) {
  opts = opts || {};
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  if (opts.active) TH.store.set(TH.KEYS.active, opts.active);
  if (opts.clients) TH.store.set(TH.KEYS.clients, opts.clients);
  const byId = {};
  const $ = function (id) {
    if (!byId[id]) byId[id] = el(id);
    return byId[id];
  };
  const loc = { href: 'https://swissystem7.github.io/TrainerHub/journal.html' };
  const run = new Function('document', 'TH', 'location', 'window', inlineScript());
  run({ getElementById: $ }, TH, loc, { open: function (url) { opened.push(url); } });
  return {
    $: $,
    location: loc,
    client: function () { return TH.store.get(TH.KEYS.clients, [])[0]; },
    act: function (name, i) {
      const btn = {
        getAttribute: function (a) { return a === 'data-act' ? name : (a === 'data-i' ? String(i || 0) : null); },
        closest: function () { return null; }
      };
      $('list').fire('click', { target: { closest: function () { return btn; } } });
    }
  };
}

function newClient() {
  return { id: 't_noa', name: 'נועה', phone: '0501234567', plan: 'טרם שויכה תוכנית', logs: [] };
}

test('«פתח כמתאמן» on a client with no plan makes the active workout their plan', function () {
  const page = loadPage({ clients: [newClient()], active: sampleWorkout('אימון רגליים 30 דק׳') });
  page.act('preview', 0);
  const c = page.client();
  assert.equal(c.plan, 'אימון רגליים 30 דק׳', 'the card no longer says «טרם שויכה תוכנית»');
  assert.equal(c.lastWorkout.title, 'אימון רגליים 30 דק׳');
  assert.ok(c.lastPlan, '«הצע שבוע הבא» has a plan to work from');
});

test('«דף להדפסה / PDF» on a client with no plan makes the active workout their plan', function () {
  const page = loadPage({ clients: [newClient()], active: sampleWorkout('אימון גב') });
  page.act('pdf', 0);
  assert.equal(page.client().plan, 'אימון גב');
});

test('«שתף אימון ללקוח» on a client with no plan names the shared workout on the card', function () {
  const page = loadPage({ clients: [newClient()], active: sampleWorkout('אימון חזה') });
  TH.setEntitlement({ tier: 'trainer' });
  opened.length = 0;
  page.act('share', 0);
  assert.equal(opened.length, 1, 'WhatsApp opened');
  assert.equal(page.client().plan, 'אימון חזה');
  assert.match(page.$('list').innerHTML, /אימון חזה/, 'the card is re-rendered with the plan');
  assert.doesNotMatch(page.$('list').innerHTML, /טרם שויכה תוכנית/);
});

test('a client with a plan of their own keeps it and the «שבוע הבא» guard', function () {
  const own = sampleWorkout('אימון ליבה · שבוע הבא');
  const c = Object.assign(newClient(), { plan: own.title, lastWorkout: own, nextFrom: '2026-10-20T10:00:00.000Z|אימון ליבה' });
  const page = loadPage({ clients: [c], active: sampleWorkout('אימון אחר') });
  page.act('preview', 0);
  const after = page.client();
  assert.equal(after.plan, 'אימון ליבה · שבוע הבא');
  assert.equal(after.lastWorkout.title, 'אימון ליבה · שבוע הבא');
  assert.equal(after.nextFrom, '2026-10-20T10:00:00.000Z|אימון ליבה');
});
