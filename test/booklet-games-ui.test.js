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
    _innerHTML: '',
    focused: false,
    focus: function () { this.focused = true; },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v);
      if (id === 'plan') {
        const first = /<option value="([^"]*)"/.exec(this._innerHTML);
        if (first && !this.value) this.value = first[1];
      }
    },
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type, eventObj) {
      const evt = Object.assign({ target: el, preventDefault: function () {} }, eventObj || {});
      (handlers[type] || []).forEach(function (fn) { fn(evt); });
    },
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
  const location = { href: 'https://swissystem7.github.io/TrainerHub/booklet.html' };
  global.location = location;
  const run = new Function('document', 'TH', 'THBooklet', 'location', inlineScript());
  run(document, TH, B, location);
  await new Promise(function (r) { setImmediate(r); });
  return { $: document.getElementById };
}

test('booklet.html declares accessible search and filter controls for prep games', function () {
  assert.match(html, /<section id="games" aria-labelledby="games-h">/);
  assert.match(html, /<label for="gcat">סוג משחק<\/label>/);
  assert.match(html, /<select id="gcat">/);
  assert.match(html, /<option value="">כל משחקי ההכנה<\/option>/);
  assert.match(html, /<option value="tag">משחקי תופסת<\/option>/);
  assert.match(html, /<option value="ball">משחקי כדור<\/option>/);
  assert.match(html, /<label for="gq">חיפוש משחק<\/label>/);
  assert.match(html, /<input id="gq" type="search"/);
  assert.match(html, /<button type="button" id="greset" class="ghost"/);
  assert.match(html, /id="gameStats"[^>]*aria-live="polite"/);
  assert.match(html, /id="gamesOut"[^>]*aria-live="polite"/);
});

test('initial state renders all 12 games with full count in stats', async function () {
  const page = await mount();
  assert.equal(page.$('gameStats').textContent, '12 מתוך 12 משחקים');
  assert.match(page.$('gamesOut').innerHTML, /משחקי תופסת \(6\)/);
  assert.match(page.$('gamesOut').innerHTML, /משחקי כדור \(6\)/);
  assert.match(page.$('gamesOut').innerHTML, /תופסת עכברים/);
});

test('selecting category tag filters to tag games only', async function () {
  const page = await mount();
  page.$('gcat').value = 'tag';
  page.$('gcat').fire('change');
  assert.equal(page.$('gameStats').textContent, '6 מתוך 12 משחקים');
  assert.match(page.$('gamesOut').innerHTML, /משחקי תופסת \(6\)/);
  assert.doesNotMatch(page.$('gamesOut').innerHTML, /משחקי כדור/);
});

test('selecting category ball filters to ball games only', async function () {
  const page = await mount();
  page.$('gcat').value = 'ball';
  page.$('gcat').fire('change');
  assert.equal(page.$('gameStats').textContent, '6 מתוך 12 משחקים');
  assert.doesNotMatch(page.$('gamesOut').innerHTML, /משחקי תופסת/);
  assert.match(page.$('gamesOut').innerHTML, /משחקי כדור \(6\)/);
});

test('text search filters games by title and description', async function () {
  const page = await mount();
  page.$('gq').value = 'עכברים';
  page.$('gq').fire('input');
  assert.equal(page.$('gameStats').textContent, '1 מתוך 12 משחקים');
  assert.match(page.$('gamesOut').innerHTML, /תופסת עכברים/);
  assert.doesNotMatch(page.$('gamesOut').innerHTML, /משחקי כדור/);
});

test('text search with no match renders accessible empty state', async function () {
  const page = await mount();
  page.$('gq').value = 'משחק_שלא_קיים';
  page.$('gq').fire('input');
  assert.equal(page.$('gameStats').textContent, '0 מתוך 12 משחקים');
  assert.match(page.$('gamesOut').innerHTML, /לא נמצאו משחקי הכנה שמתאימים לחיפוש/);
});

test('clicking reset button restores all games and clears search inputs', async function () {
  const page = await mount();
  page.$('gcat').value = 'ball';
  page.$('gcat').fire('change');
  page.$('gq').value = 'כדור';
  page.$('gq').fire('input');

  page.$('greset').click();
  assert.equal(page.$('gcat').value, '');
  assert.equal(page.$('gq').value, '');
  assert.equal(page.$('gameStats').textContent, '12 מתוך 12 משחקים');
  assert.match(page.$('gamesOut').innerHTML, /משחקי תופסת \(6\)/);
  assert.match(page.$('gamesOut').innerHTML, /משחקי כדור \(6\)/);
  assert.equal(page.$('gq').focused, true);
});

test('pressing Escape in search input clears query and updates list', async function () {
  const page = await mount();
  page.$('gq').value = 'עכברים';
  page.$('gq').fire('input');
  assert.equal(page.$('gameStats').textContent, '1 מתוך 12 משחקים');

  page.$('gq').fire('keydown', { key: 'Escape' });
  assert.equal(page.$('gq').value, '');
  assert.equal(page.$('gameStats').textContent, '12 מתוך 12 משחקים');
});
