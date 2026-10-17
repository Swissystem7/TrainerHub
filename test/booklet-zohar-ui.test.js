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
  const el = {
    id: id,
    value: '',
    textContent: '',
    _hidden: id === 'zoharEmpty',
    get hidden() { return this._hidden; },
    set hidden(v) { this._hidden = !!v; },
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v);
      if (id === 'plan') {
        const first = /<option value="([^"]*)"/.exec(this._innerHTML);
        if (first && !this.value) this.value = first[1];
      }
    },
    options: id === 'zcat' ? [
      { value: '', text: 'כל הכללים' },
      { value: 'goals', text: 'הבקעה ושערים' },
      { value: 'keeper', text: 'חוקי שוער' },
      { value: 'fouls', text: 'עבירות, משמעת ובטיחות' },
      { value: 'movement', text: 'תנועה ומסירה' },
      { value: 'match', text: 'ניהול משחק, זמנים וחוקים' }
    ] : [],
    selectedIndex: 0,
    focus: function () {},
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type) { (handlers[type] || []).forEach(function (fn) { fn({ target: el, preventDefault: function () {} }); }); },
    click: function () { this.fire('click'); },
    insertAdjacentHTML: function (pos, txt) { this._innerHTML += txt; },
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
  const copied = [];
  const th = Object.assign({}, TH, {
    copyText: function (text) {
      copied.push(text);
      return Promise.resolve({ ok: true });
    }
  });
  const location = { href: 'https://swissystem7.github.io/TrainerHub/booklet.html' };
  global.location = location;
  const run = new Function('document', 'TH', 'THBooklet', 'location', inlineScript());
  run(document, th, B, location);
  await new Promise(function (r) { setImmediate(r); });
  return { $: document.getElementById, copied: copied };
}

test('booklet.html declares Zohar ball UI controls with accessible labels', function () {
  assert.match(html, /<section id="zohar" aria-labelledby="zohar-h">/);
  assert.match(html, /<label for="zq">חיפוש בחוקה<\/label>/);
  assert.match(html, /<input id="zq" type="search"[^>]*aria-controls="zoharOut"/);
  assert.match(html, /<label for="zcat">נושא<\/label>/);
  assert.match(html, /<select id="zcat">/);
  assert.match(html, /<button type="button" id="zoharReset" class="ghost">נקה סינון<\/button>/);
  assert.match(html, /<button type="button" id="zoharCopy" class="ghost">העתק חוקה<\/button>/);
  assert.match(html, /<button type="button" id="zoharPrint" class="ghost">הדפס חוקה<\/button>/);
  assert.match(html, /<div class="status" id="zoharStatus" role="status" aria-live="polite"><\/div>/);
  assert.match(html, /<p class="muted" id="zoharStats" aria-live="polite"><\/p>/);
  assert.match(html, /<div id="zoharEmpty" class="card empty" role="region" aria-live="polite" hidden>/);
  assert.match(html, /<ol id="zoharOut" aria-label="רשימת כללי כדור זוהר"><\/ol>/);
});

test('initial load renders all 25 rules and stats', async function () {
  const page = await mount();
  assert.match(page.$('zoharStats').textContent, /25 מתוך 25/);
  assert.equal(page.$('zoharEmpty').hidden, true);
  assert.match(page.$('zoharOut').innerHTML, /value="1"/);
  assert.match(page.$('zoharOut').innerHTML, /value="25"/);
});

test('filtering by category keeper limits to goalkeeper rules', async function () {
  const page = await mount();
  page.$('zcat').value = 'keeper';
  page.$('zcat').selectedIndex = 2;
  page.$('zcat').fire('change');
  assert.match(page.$('zoharStats').textContent, /3 מתוך 25/);
  assert.match(page.$('zoharOut').innerHTML, /value="10"/);
  assert.doesNotMatch(page.$('zoharOut').innerHTML, /value="1"/);
});

test('searching by text filters rules and preserves original rule numbers', async function () {
  const page = await mount();
  page.$('zq').value = 'פנדל';
  page.$('zq').fire('input');
  assert.match(page.$('zoharStats').textContent, /כללים/);
  assert.match(page.$('zoharOut').innerHTML, /value="17"/);
  assert.match(page.$('zoharOut').innerHTML, /value="18"/);
});

test('empty search result reveals accessible empty state', async function () {
  const page = await mount();
  page.$('zq').value = 'תרגילשאינוקייםכלל';
  page.$('zq').fire('input');
  assert.equal(page.$('zoharEmpty').hidden, false);
  assert.equal(page.$('zoharOut').innerHTML, '');
  assert.match(page.$('zoharStats').textContent, /0 מתוך 25/);
});

test('clicking reset restores all rules and clears search input', async function () {
  const page = await mount();
  page.$('zq').value = 'פנדל';
  page.$('zq').fire('input');
  assert.notEqual(page.$('zq').value, '');

  page.$('zoharReset').click();
  assert.equal(page.$('zq').value, '');
  assert.equal(page.$('zcat').value, '');
  assert.equal(page.$('zoharEmpty').hidden, true);
  assert.match(page.$('zoharStats').textContent, /25 מתוך 25/);
});

test('clicking copy invokes copyText with formatted rules list and sets feedback', async function () {
  const page = await mount();
  page.$('zoharCopy').click();
  await new Promise(function (r) { setImmediate(r); });
  assert.equal(page.copied.length, 1);
  assert.match(page.copied[0], /חוקת כדור זוהר/);
  assert.match(page.copied[0], /1\. /);
  assert.equal(page.$('zoharCopy').textContent, 'הועתק ללוח');
  assert.match(page.$('zoharStatus').textContent, /הועתקה ללוח/);
});
