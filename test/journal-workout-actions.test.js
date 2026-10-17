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
  run({ getElementById: $ }, TH, loc, { open: function () {} });
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

test('journal.html defines data-act="pdf" action and accessible aria-labels on client cards', function () {
  assert.match(html, /data-act="pdf"/, 'declares pdf action');
  assert.match(html, /aria-label="דף להדפסה \/ PDF עבור/);
  assert.match(html, /aria-label="פתח כמתאמן עבור/);
  assert.match(html, /aria-label="שתף אימון עבור/);
});

test('clicking data-act="pdf" prepares print and navigates to workout-print.html', function () {
  const w = sampleWorkout('אימון כוח אישי');
  const client = {
    id: 't_dana',
    name: 'דנה כהן',
    phone: '0501234567',
    plan: w.title,
    lastWorkout: w,
    logs: []
  };
  const page = loadPage({ clients: [client] });
  page.act('pdf', 0);

  const printEntry = TH.store.get(TH.KEYS.print);
  assert.ok(printEntry, 'stored print entry');
  assert.equal(printEntry.workout.title, 'אימון כוח אישי');
  assert.match(page.location.href, /workout-print\.html/);
});

test('clicking data-act="pdf" uses activeWorkout when client has no assigned lastWorkout', function () {
  const activeW = sampleWorkout('אימון פעיל כללי');
  const client = {
    id: 't_yossi',
    name: 'יוסי',
    phone: '',
    plan: 'טרם שויכה תוכנית',
    logs: []
  };
  const page = loadPage({ clients: [client], active: activeW });
  page.act('pdf', 0);

  const printEntry = TH.store.get(TH.KEYS.print);
  assert.ok(printEntry, 'stored print entry from active workout');
  assert.equal(printEntry.workout.title, 'אימון פעיל כללי');
  assert.match(page.location.href, /workout-print\.html/);
});

test('clicking data-act="pdf" warns when no workout is assigned or active', function () {
  const client = {
    id: 't_alon',
    name: 'אלון',
    phone: '',
    plan: 'טרם שויכה תוכנית',
    logs: []
  };
  const page = loadPage({ clients: [client] });
  page.act('pdf', 0);

  assert.equal(TH.store.get(TH.KEYS.print, null), null);
  assert.equal(page.location.href, 'https://swissystem7.github.io/TrainerHub/journal.html');
  assert.match(page.$('importStatus').textContent, /אין אימון/);
  assert.match(page.$('importStatus').className, /warn/);
});
