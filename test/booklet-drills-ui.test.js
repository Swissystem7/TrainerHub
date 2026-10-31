'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'booklet.html'), 'utf8');
const main = JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8'));
const team = JSON.parse(fs.readFileSync(path.join(root, B.TEAM_PATH), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));

B.setData(main, team);
TH.setCatalog(catalog);

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start !== -1 && end !== -1, 'booklet.html has an inline script');
  return html.slice(start + '<script>'.length, end);
}

function makeElement(id) {
  const handlers = {};
  let focused = false;
  const el = {
    id: id,
    value: id === 'cat' ? 'warmup' : '',
    textContent: '',
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v);
      if (id === 'plan') {
        const first = /<option value="([^"]*)"/.exec(this._innerHTML);
        if (first && !this.value) this.value = first[1];
      }
    },
    addEventListener: function (type, fn) {
      (handlers[type] = handlers[type] || []).push(fn);
    },
    fire: function (type, eventProps) {
      const evt = Object.assign({
        target: el,
        preventDefault: function () {}
      }, eventProps || {});
      (handlers[type] || []).forEach(function (fn) { fn(evt); });
    },
    click: function (eventProps) { this.fire('click', eventProps); },
    focus: function () { focused = true; },
    get isFocused() { return focused; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  return el;
}

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = { href: 'https://swissystem7.github.io/TrainerHub/booklet.html' };

async function mount() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const elements = {};
  const document = {
    getElementById: function (id) {
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    }
  };
  const location = { href: 'https://swissystem7.github.io/TrainerHub/booklet.html' };
  global.location = location;

  const run = new Function('document', 'TH', 'THBooklet', 'location', inlineScript());
  run(document, TH, B, location);
  await new Promise(function (r) { setImmediate(r); });
  return { $: document.getElementById, elements: elements };
}

test('booklet.html declares accessible attributes and reset controls in #drills section', function () {
  assert.match(html, /<section id="drills" aria-labelledby="drills-h">/);
  assert.match(html, /<select id="cat" aria-label="סינון תרגילים לפי קטגוריה">/);
  assert.match(html, /<input id="dq" type="search" placeholder="[^"]+" aria-label="חיפוש תרגיל לפי שם או אזור גוף" autocomplete="off" aria-controls="drillOut">/);
  assert.match(html, /<div class="actions no-print" role="toolbar" aria-label="פעולות סינון בנק תרגילים">/);
  assert.match(html, /<button type="button" class="ghost" id="drillReset" aria-label="נקה חיפוש ואיפוס סינון תרגילים">נקה סינון<\/button>/);
  assert.match(html, /<p class="muted" id="drillStats" role="status" aria-live="polite"><\/p>/);
  assert.match(html, /<div class="grid" id="drillOut" role="region" aria-label="רשימת תרגילים מהחוברת"><\/div>/);
  assert.match(html, /button:focus-visible/);
  assert.match(html, /\.empty-drills/);
});

test('initial mount renders default warmup drills', async function () {
  const page = await mount();
  assert.equal(page.$('cat').value, 'warmup');
  assert.equal(page.$('dq').value, '');
  assert.match(page.$('drillStats').textContent, /19 תרגילים/);
  assert.match(page.$('drillOut').innerHTML, /<article class="card">/);
});

test('searching with valid keyword filters the drills', async function () {
  const page = await mount();
  page.$('dq').value = 'כתף';
  page.$('dq').fire('input');
  assert.match(page.$('drillOut').innerHTML, /כתף/);
  assert.equal(page.$('drillStats').textContent, 'תרגיל אחד');
});

test('searching with non-matching keyword shows accessible empty state with reset button', async function () {
  const page = await mount();
  page.$('dq').value = 'מונחלאקייםבכלל123';
  page.$('dq').fire('input');

  assert.equal(page.$('drillStats').textContent, '0 תרגילים');
  assert.match(page.$('drillOut').innerHTML, /class="card empty-drills" role="status"/);
  assert.match(page.$('drillOut').innerHTML, /לא נמצאו תרגילים התואמים את החיפוש «מונחלאקייםבכלל123»/);
  assert.match(page.$('drillOut').innerHTML, /id="emptyDrillReset"/);
});

test('clicking empty state reset button restores full category list and clears search input', async function () {
  const page = await mount();
  page.$('dq').value = 'חיפוששגוי';
  page.$('dq').fire('input');
  assert.equal(page.$('drillStats').textContent, '0 תרגילים');

  page.$('drillOut').fire('click', { target: { id: 'emptyDrillReset' } });
  assert.equal(page.$('dq').value, '');
  assert.equal(page.$('cat').value, 'warmup');
  assert.match(page.$('drillStats').textContent, /19 תרגילים/);
  assert.match(page.$('drillOut').innerHTML, /<article class="card">/);
  assert.ok(page.$('dq').isFocused, 'search input focused after reset');
});

test('clicking #drillReset button resets filters and restores all warmup drills', async function () {
  const page = await mount();
  page.$('cat').value = 'flexibility';
  page.$('cat').fire('change');
  assert.match(page.$('drillStats').textContent, /41 תרגילים/);

  page.$('dq').value = 'מתיחה';
  page.$('dq').fire('input');

  page.$('drillReset').click();
  assert.equal(page.$('dq').value, '');
  assert.equal(page.$('cat').value, 'warmup');
  assert.match(page.$('drillStats').textContent, /19 תרגילים/);
});

test('pressing Escape in search input clears search and re-renders', async function () {
  const page = await mount();
  page.$('dq').value = 'סיבוב';
  page.$('dq').fire('input');

  page.$('dq').fire('keydown', { key: 'Escape' });
  assert.equal(page.$('dq').value, '');
  assert.equal(page.$('cat').value, 'warmup');
  assert.match(page.$('drillStats').textContent, /19 תרגילים/);
});
