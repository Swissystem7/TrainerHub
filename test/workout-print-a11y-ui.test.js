'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/workout-print.html',
  pathname: '/TrainerHub/workout-print.html',
  hash: '',
  search: ''
};

const TH = require(path.join(root, 'js', 'core.js'));
TH.setCatalog({});

const html = fs.readFileSync(path.join(root, 'workout-print.html'), 'utf8');

function inlineScripts(src) {
  const open = '<script>';
  const close = '</script>';
  const out = [];
  let from = 0;
  for (;;) {
    const start = src.indexOf(open, from);
    if (start === -1) break;
    const end = src.indexOf(close, start + open.length);
    if (end === -1) break;
    out.push(src.slice(start + open.length, end));
    from = end + close.length;
  }
  return out;
}

function pageScript() {
  const scripts = inlineScripts(html);
  const src = scripts.find((s) => s.indexOf('brandForm') !== -1);
  assert.ok(src, 'inline page script with brandForm found');
  return src;
}

function mountPage() {
  const els = {};
  const handlers = {};
  function el(id) {
    if (!els[id]) {
      const attrs = {};
      els[id] = {
        id: id,
        value: '',
        innerHTML: '',
        textContent: '',
        disabled: false,
        getAttribute: function (k) { return attrs[k] != null ? attrs[k] : null; },
        setAttribute: function (k, v) { attrs[k] = String(v); },
        removeAttribute: function (k) { delete attrs[k]; },
        addEventListener: function (type, fn) { handlers[id + ':' + type] = fn; }
      };
    }
    return els[id];
  }
  const document = { getElementById: el };
  const fn = new Function('document', 'TH', 'window', pageScript());
  fn(document, TH, { print: function () {} });
  return {
    el: el,
    submitBrand: function (name) {
      el('brand').value = name;
      handlers['brandForm:submit']({ preventDefault: function () {} });
    }
  };
}

function reset() {
  Object.keys(mem).forEach((k) => { delete mem[k]; });
}

test('workout-print.html static: nav has accessible label and active page indicator', function () {
  assert.match(html, /<nav class="th-nav no-print" aria-label="ניווט ראשי">/);
  assert.match(html, /<span class="chip on">דף להדפסה<\/span>/);
});

test('workout-print.html static: toolbar form and interactive elements have accessible roles and labels', function () {
  assert.match(html, /<form class="toolbar no-print" id="brandForm" role="toolbar" aria-label="הגדרות הדפסה ומיתוג אימון">/);
  assert.match(html, /<input id="brand"[^>]+aria-label="שם המאמן או הסטודיו בדף ההדפסה"/);
  assert.match(html, /<button type="submit" class="th-btn ghost" id="updateBrandBtn" aria-label="עדכן שם מאמן או סטודיו">עדכן שם<\/button>/);
  assert.match(html, /<button type="button" class="th-btn" id="printBtn" aria-label="הדפס את דף האימון או שמור כ־PDF">הדפס \/ שמור כ־PDF<\/button>/);
  assert.match(html, /<a class="th-btn ghost" id="backBtn" href="\.\/" aria-label="חזרה לבונה האימון">חזרה לבונה<\/a>/);
  assert.match(html, /<p class="honest no-print" id="hint" role="status" aria-live="polite"/);
  assert.match(html, /<div id="sheet" role="region" aria-label="תצוגת דף אימון להדפסה"><\/div>/);
});

test('workout-print.html CSS: focus-visible outline and disabled button styling are declared', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
  assert.match(html, /\.th-btn\[disabled\],\s*\.th-btn\[aria-disabled="true"\]/);
});

test('workout-print.html dynamic: empty state disables print button and renders accessible message with call-to-action', function () {
  reset();
  const page = mountPage();
  assert.match(page.el('sheet').innerHTML, /<div class="empty" role="status">/);
  assert.match(page.el('sheet').innerHTML, /אין אימון בדפדפן/);
  assert.match(page.el('sheet').innerHTML, /בנה אימון עכשיו/);
  assert.equal(page.el('printBtn').disabled, true);
  assert.equal(page.el('printBtn').getAttribute('aria-disabled'), 'true');
});

test('workout-print.html dynamic: active workout renders sheet and enables print button', function () {
  reset();
  TH.store.set(TH.KEYS.active, {
    title: 'אימון פונקציונלי',
    phases: [{ name: 'Main', exercises: [{ id: 'pushup', name: 'שכיבות סמיכה', sets: 4, reps: 15 }] }]
  });
  const page = mountPage();
  assert.match(page.el('sheet').innerHTML, /אימון פונקציונלי/);
  assert.match(page.el('sheet').innerHTML, /שכיבות סמיכה/);
  assert.equal(page.el('printBtn').disabled, false);
  assert.equal(page.el('printBtn').getAttribute('aria-disabled'), null);
});
