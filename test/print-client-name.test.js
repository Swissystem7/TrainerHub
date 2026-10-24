'use strict';

// The journal's «דף להדפסה / PDF עבור <מתאמן>» passes the client's name to
// TH.preparePrint, but it was never stored or printed: the sheet a coach
// printed for Dana looked exactly like any other, with no name on it.
// The name belongs to that one print, so the next «דף להדפסה» without a name
// must not carry it over to another workout.
// The page script is extracted from the HTML and run against the real core.js
// with a stubbed document, replaying the real tap sequence.
// with a stubbed document, replaying the real tap sequence.

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

// Inline <script> blocks, located with indexOf rather than a tag regexp
// (CodeQL js/bad-tag-filter flags regexps that only match lower-case tags).
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
      els[id] = {
        id: id,
        value: '',
        innerHTML: '',
        textContent: '',
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

function workout(title, name) {
  return { title: title, phases: [{ name: 'Main', exercises: [{ id: 'x', name: name, sets: 3, reps: 12 }] }] };
}

test('a sheet printed from a client card says who it is for', function () {
  reset();
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), { name: 'דנה כהן' });
  const sheet = mountPage().el('sheet').innerHTML;
  assert.match(sheet, /<p class="print-client">עבור: דנה כהן<\/p>/);
});

test('the client name stays after «עדכן שם» and reload', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: '' });
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), { name: 'דנה כהן' });
  mountPage().submitBrand('סטודיו יוסי');
  const sheet = mountPage().el('sheet').innerHTML;
  assert.match(sheet, /print-brand">סטודיו יוסי/);
  assert.match(sheet, /עבור: דנה כהן/);
});

test('the next print without a client has no name on it', function () {
  reset();
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), { name: 'דנה כהן' });
  TH.preparePrint(workout('אימון גב', 'מתח'), {});
  const sheet = mountPage().el('sheet').innerHTML;
  assert.match(sheet, /אימון גב/);
  assert.doesNotMatch(sheet, /print-client|דנה/);
});

test('a client name with markup is printed as text', function () {
  const html = TH.workoutPrintHtml(TH.workoutPrintModel(workout('אימון', 'סקוואט'), { client: '<b>דנה</b> & יוסי' }));
  assert.match(html, /עבור: דנה &amp; יוסי/);
});
