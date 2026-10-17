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

const TH = require(path.join(root, 'js', 'core.js'));
TH.setCatalog({});

const html = fs.readFileSync(path.join(root, 'offer.html'), 'utf8');

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
  const src = scripts.find((s) => s.indexOf('redeemForm') !== -1);
  assert.ok(src, 'inline page script with redeemForm found');
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
        className: '',
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
  const fn = new Function('document', 'TH', pageScript());
  fn(document, TH);
  return {
    el: el,
    submitRedeem: function (code, brand) {
      if (code !== undefined) el('code').value = code;
      if (brand !== undefined) el('brand').value = brand;
      handlers['redeemForm:submit']({ preventDefault: function () {} });
    },
    clickClear: function () {
      handlers['clearBtn:click']();
    }
  };
}

function reset() {
  Object.keys(mem).forEach((k) => { delete mem[k]; });
}

test('offer.html static: nav has accessible label, active page indicator and full site links', function () {
  assert.match(html, /<nav class="th-nav" aria-label="ניווט ראשי">/);
  assert.match(html, /<span class="chip on">הצעה למאמנים<\/span>/);
  assert.match(html, /<a href="\.\/booklet\.html">חוברת הקורס<\/a>/);
  assert.match(html, /<a href="\.\/frontend\/workout-mode\.html">מצב אימון חי<\/a>/);
});

test('offer.html static: landmarks and heading associations are declared', function () {
  assert.match(html, /<section class="card" aria-labelledby="have-heading">/);
  assert.match(html, /<h2 id="have-heading">מה יש בפועל<\/h2>/);
  assert.match(html, /<section class="grid" id="plans" role="region" aria-label="מסלולים ומחירים">/);
  assert.match(html, /<article class="card" id="plan-practice" aria-labelledby="practice-heading">/);
  assert.match(html, /<h2 id="practice-heading">תרגול<\/h2>/);
  assert.match(html, /<article class="card" id="share" aria-labelledby="trainer-heading">/);
  assert.match(html, /<h2 id="trainer-heading">מאמן<\/h2>/);
  assert.match(html, /<section class="card" aria-labelledby="not-have-heading">/);
  assert.match(html, /<h2 id="not-have-heading">מה במכוון אין<\/h2>/);
  assert.match(html, /<section class="card" aria-labelledby="redeem-heading">/);
  assert.match(html, /<h2 id="redeem-heading">הפעלת מסלול מאמן \(אחרי תשלום מחוץ לאתר\)<\/h2>/);
  assert.match(html, /<section class="card" aria-labelledby="compare-heading">/);
  assert.match(html, /<h2 id="compare-heading">איך זה מתיישב מול מה שמשלמים היום<\/h2>/);
  assert.match(html, /<table aria-label="השוואת מחירים מול מערכות קיימות בשוק">/);
});

test('offer.html static: form controls and live status regions have accessible attributes', function () {
  assert.match(html, /<p id="haveStats" role="status" aria-live="polite">/);
  assert.match(html, /<p class="honest" id="entStatus" role="status" aria-live="polite">/);
  assert.match(html, /<form id="redeemForm" aria-label="טופס הפעלת קוד גישה למאמן">/);
  assert.match(html, /<input id="brand"[^>]+aria-label="שם שיופיע על דף האימון \(לא חובה\)"/);
  assert.match(html, /<input id="code"[^>]+aria-label="קוד גישה"/);
  assert.match(html, /<button type="submit" class="th-btn" id="redeemSubmitBtn" aria-label="הפעל מסלול מאמן במכשיר הזה">/);
  assert.match(html, /<button type="button" class="th-btn ghost" id="clearBtn" aria-label="בטל גישת מאמן במכשיר הזה">/);
  assert.match(html, /<a class="th-btn ghost" id="contactDirect"[^>]+aria-label="פנייה ישירה לקבלת קוד גישה"/);
  assert.match(html, /<a class="th-btn ghost" id="contactForm"[^>]+aria-label="בקשת קוד גישה באמצעות טופס בעברית בגיטהאב"/);
  assert.match(html, /<p class="status" id="redeemStatus" role="status" aria-live="polite"><\/p>/);
});

test('offer.html CSS: focus-visible outline and disabled button styles are defined', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
  assert.match(html, /\.th-btn\[disabled\],\s*\.th-btn\[aria-disabled="true"\]/);
});

test('offer.html dynamic: initial state reflects practice entitlement', function () {
  reset();
  const page = mountPage();
  assert.match(page.el('entStatus').textContent, /הדפדפן הזה במסלול תרגול/);
});

test('offer.html dynamic: empty code input shows accessible warning message', function () {
  reset();
  const page = mountPage();
  page.submitRedeem('   ', 'סטודיו דמו');
  assert.match(page.el('redeemStatus').textContent, /נא להזין קוד גישה/);
  assert.equal(page.el('redeemStatus').className, 'status warn');
});

test('offer.html dynamic: invalid code displays error with warn class', function () {
  reset();
  const page = mountPage();
  page.submitRedeem('invalid-code', 'סטודיו דמו');
  assert.match(page.el('redeemStatus').textContent, /הקוד לא תואם/);
  assert.equal(page.el('redeemStatus').className, 'status warn');
});

test('offer.html dynamic: clearing entitlement resets inputs, entitlement text and status', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'סטודיו אלפא' });
  const page = mountPage();
  assert.match(page.el('entStatus').textContent, /המכשיר הזה במסלול מאמן/);
  page.clickClear();
  assert.match(page.el('entStatus').textContent, /הדפדפן הזה במסלול תרגול/);
  assert.match(page.el('redeemStatus').textContent, /הגישה בוטלה במכשיר הזה/);
  assert.equal(page.el('redeemStatus').className, 'status');
  assert.equal(page.el('code').value, '');
  assert.equal(page.el('brand').value, '');
});
