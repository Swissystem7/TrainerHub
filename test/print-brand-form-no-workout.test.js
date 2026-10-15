'use strict';

// workout-print.html: pressing «עדכן שם» while no workout is stored used to
// save { workout: {} } under KEYS.print. That empty object counted as a workout,
// so the «אין אימון» message turned into a blank sheet, and from then on the
// empty print entry shadowed any workout the coach built later (KEYS.active).
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

function pageScript() {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
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

test('«עדכן שם» with no workout keeps the «אין אימון» message instead of a blank sheet', function () {
  reset();
  const page = mountPage();
  assert.match(page.el('sheet').innerHTML, /אין אימון בדפדפן/);

  page.submitBrand('סטודיו דנה');

  assert.match(page.el('sheet').innerHTML, /אין אימון בדפדפן/, 'still no workout to print');
  assert.doesNotMatch(page.el('sheet').innerHTML, /print-sheet/, 'no empty sheet rendered');
  const stored = TH.store.get(TH.KEYS.print, null);
  assert.ok(stored, 'the name itself is kept');
  assert.equal(stored.brand, 'סטודיו דנה');
});

test('a workout built later (KEYS.active) is printed even after the name was saved first', function () {
  reset();
  const first = mountPage();
  first.submitBrand('סטודיו דנה');

  const active = {
    title: 'אימון רגליים',
    phases: [{ name: 'Main', exercises: [{ id: 'squat', name: 'סקוואט', sets: 3, reps: 12 }] }]
  };
  TH.store.set(TH.KEYS.active, active);

  const page = mountPage();
  const sheet = page.el('sheet').innerHTML;
  assert.match(sheet, /אימון רגליים/, 'the active workout wins over the stale empty print entry');
  assert.match(sheet, /סקוואט/);
  assert.doesNotMatch(sheet, /אין אימון בדפדפן/);
});

test('the saved name is restored into the field on the next visit', function () {
  reset();
  const first = mountPage();
  first.submitBrand('סטודיו דנה');

  const page = mountPage();
  assert.equal(page.el('brand').value, 'סטודיו דנה');
});

test('a real print entry still wins over the active workout', function () {
  reset();
  TH.store.set(TH.KEYS.active, {
    title: 'אימון ישן',
    phases: [{ name: 'Main', exercises: [{ id: 'plank', name: 'פלאנק', sets: 3, duration_seconds: 30 }] }]
  });
  TH.preparePrint({
    title: 'אימון להדפסה',
    phases: [{ name: 'Main', exercises: [{ id: 'squat', name: 'סקוואט', sets: 3, reps: 12 }] }]
  }, {});

  const page = mountPage();
  assert.match(page.el('sheet').innerHTML, /אימון להדפסה/);
  assert.doesNotMatch(page.el('sheet').innerHTML, /אימון ישן/);
});
