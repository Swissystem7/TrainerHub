'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'journal.html'), 'utf8');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');

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
    location: loc
  };
}

test('journal.html has skip-link and valid Hebrew RTL headers', function () {
  assert.match(html, /lang="he"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /<a\s+class="skip-link"\s+href="#importCode">דלג לייבוא קוד<\/a>/);
});

test('journal.html forms declare landmark regions and aria-labelledby headers', function () {
  assert.match(html, /<form\s+class="card"\s+id="importForm"\s+role="region"\s+aria-labelledby="importHeading">/);
  assert.match(html, /<h2\s+id="importHeading">ייבוא קוד מהוואטסאפ<\/h2>/);
  assert.match(html, /<form\s+class="card"\s+id="addForm"\s+role="region"\s+aria-labelledby="addHeading">/);
  assert.match(html, /<h2\s+id="addHeading">מתאמן חדש \(נשמר כאן בלבד\)<\/h2>/);
  assert.match(html, /<form\s+class="card"\s+id="coachBuildForm"\s+role="region"\s+aria-labelledby="coachBuildHeading">/);
  assert.match(html, /<h2\s+id="coachBuildHeading">בנה ושייך אימון למתאמן<\/h2>/);
});

test('journal.html form submit buttons declare descriptive aria-labels and toolbars', function () {
  assert.match(html, /<div\s+class="actions"\s+role="toolbar"\s+aria-label="פעולות ייבוא קוד">/);
  assert.match(html, /<button\s+type="submit"\s+class="th-btn"\s+aria-label="ייבא קוד ליומן">ייבא ליומן<\/button>/);
  assert.match(html, /<div\s+class="actions"\s+role="toolbar"\s+aria-label="פעולות הוספת מתאמן">/);
  assert.match(html, /<button\s+type="submit"\s+class="th-btn ghost"\s+aria-label="הוסף מתאמן חדש">הוסף מתאמן<\/button>/);
  assert.match(html, /<div\s+class="actions"\s+role="toolbar"\s+aria-label="פעולות בניית אימון ושיוך למתאמן">/);
  assert.match(html, /<button\s+type="submit"\s+class="th-btn"\s+aria-label="בנה ושייך אימון למתאמן">בנה ושייך אימון<\/button>/);
});

test('journal.html status elements expose polite aria-live regions', function () {
  assert.match(html, /<p\s+class="status"\s+id="importStatus"\s+role="status"\s+aria-live="polite"><\/p>/);
  assert.match(html, /<p\s+class="status"\s+id="coachStatus"\s+role="status"\s+aria-live="polite"><\/p>/);
});

test('journal.html stats and list sections declare accessible landmarks', function () {
  assert.match(html, /<section\s+class="stats"\s+aria-label="סטטיסטיקת יומן ביצוע"\s+aria-live="polite">/);
  assert.match(html, /<section\s+id="list"\s+role="region"\s+aria-label="רשימת מתאמנים וביצועים"><\/section>/);
});

test('journal.html CSS defines focus-visible outline for interactive controls', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*textarea:focus-visible,\s*select:focus-visible,\s*a:focus-visible/);
  assert.match(html, /outline:\s*2px solid var\(--lime\);/);
});

test('journal.html dynamic: empty client list renders accessible empty state with role=status and aria-live', function () {
  const page = loadPage({ clients: [] });
  assert.match(page.$('list').innerHTML, /<p class="empty" role="status" aria-live="polite">עדיין אין מתאמנים אמיתיים/);
  assert.equal(page.$('clActive').textContent, '0');
  assert.equal(page.$('clAdherence').textContent, '0%');
  assert.equal(page.$('clRisk').textContent, '0');
});

test('journal.html dynamic: client card renders accessible toolbar and button aria-labels', function () {
  const client = {
    id: 't_dana',
    name: 'דנה',
    phone: '0501234567',
    plan: 'אימון ליבה',
    logs: []
  };
  const page = loadPage({ clients: [client] });
  const htmlOut = page.$('list').innerHTML;

  assert.match(htmlOut, /<article class="card">/);
  assert.match(htmlOut, /role="region" aria-label="כרטיס מתאמן דנה"/);
  assert.match(htmlOut, /role="toolbar" aria-label="פעולות עבור דנה"/);
  assert.match(htmlOut, /aria-label="פתח כמתאמן עבור דנה"/);
  assert.match(htmlOut, /aria-label="שתף אימון עבור דנה"/);
  assert.match(htmlOut, /aria-label="תזכורת בוואטסאפ עבור דנה"/);
  assert.match(htmlOut, /aria-label="הצע שבוע הבא עבור דנה"/);
  assert.match(htmlOut, /aria-label="שייך אימון פעיל לדנה"/);
  assert.match(htmlOut, /<span class="risk" role="note">בלי ביצוע שבוע<\/span>/);
});
