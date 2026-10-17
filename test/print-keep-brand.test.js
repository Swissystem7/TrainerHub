'use strict';

// «דף להדפסה» (home page, studio, booklet) calls TH.preparePrint(workout, {})
// with no brand, and it wrote brand: '' over the name the trainer had saved
// with «עדכן שם» on the print page. A trainer whose access code was redeemed
// without a brand (the offer page says the name is optional) typed the
// studio name once, and the next workout they printed came back with an empty
// name field and the «תרגול — לא למסירה ללקוח» watermark.
// The page script is extracted from the HTML and run against the real core.js
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

test('a name saved with «עדכן שם» survives the next «דף להדפסה»', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: '' });
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), {});
  mountPage().submitBrand('סטודיו דנה');

  // The trainer goes back, builds another workout and presses «דף להדפסה».
  TH.preparePrint(workout('אימון גב', 'מתח'), {});
  assert.equal(TH.store.get(TH.KEYS.print, null).brand, 'סטודיו דנה');

  const page = mountPage();
  assert.equal(page.el('brand').value, 'סטודיו דנה');
  const sheet = page.el('sheet').innerHTML;
  assert.match(sheet, /אימון גב/, 'the new workout is printed');
  assert.match(sheet, /print-brand">סטודיו דנה/, 'with the saved name on top');
  assert.doesNotMatch(sheet, /print-watermark/);
});

test('an explicit brand still replaces the saved one, and an empty start stays empty', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: '' });
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), {});
  assert.equal(TH.store.get(TH.KEYS.print, null).brand, '');

  mountPage().submitBrand('סטודיו דנה');
  TH.preparePrint(workout('אימון גב', 'מתח'), { brand: 'סטודיו יוסי' });
  assert.equal(TH.store.get(TH.KEYS.print, null).brand, 'סטודיו יוסי');

  TH.preparePrint(workout('אימון בטן', 'פלאנק'), { brand: '' });
  assert.equal(TH.store.get(TH.KEYS.print, null).brand, '', 'clearing on purpose still works');
});
