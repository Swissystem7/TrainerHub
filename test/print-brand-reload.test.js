'use strict';

// A trainer whose access code was redeemed with a brand («סטודיו דנה») changes
// the name on the print page with «עדכן שם». The sheet showed the new name, but
// on the next visit TH.ready filled the field from the entitlement brand first,
// so the print page went back to the old name; and emptying the field still
// printed the old name, because workoutPrintModel falls back to ent.brand.
// «עדכן שם» on the trainer tier now updates the entitlement brand as well.
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

test('a name changed with «עדכן שם» is still there after a reload', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'סטודיו דנה', at: 1000 });
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), {});
  assert.equal(mountPage().el('brand').value, 'סטודיו דנה');

  mountPage().submitBrand('דנה כהן אימונים');

  const page = mountPage();
  assert.equal(page.el('brand').value, 'דנה כהן אימונים');
  assert.match(page.el('sheet').innerHTML, /print-brand">דנה כהן אימונים/);
  const ent = TH.entitlement();
  assert.equal(ent.tier, 'trainer');
  assert.equal(ent.brand, 'דנה כהן אימונים');
  assert.equal(ent.at, 1000, 'the activation time is kept');
});

test('emptying the name removes it from the sheet', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'סטודיו דנה' });
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), {});
  const page = mountPage();
  page.submitBrand('');
  assert.doesNotMatch(page.el('sheet').innerHTML, /סטודיו דנה/);

  const again = mountPage();
  assert.equal(again.el('brand').value, '');
  assert.doesNotMatch(again.el('sheet').innerHTML, /סטודיו דנה/);
  assert.equal(TH.entitlement().tier, 'trainer', 'the trainer tier stays active');
});

test('«עדכן שם» without a code does not grant the trainer tier', function () {
  reset();
  TH.preparePrint(workout('אימון רגליים', 'סקוואט'), {});
  mountPage().submitBrand('סטודיו דנה');
  assert.equal(TH.entitlement().tier, 'free');
  assert.match(mountPage().el('sheet').innerHTML, /print-watermark/);
});
