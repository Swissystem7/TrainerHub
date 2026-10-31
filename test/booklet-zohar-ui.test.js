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

test('booklet.html declares accessible search, filter and action controls for zohar ball rules', function () {
  assert.match(html, /<section id="zohar" aria-labelledby="zohar-h">/);
  assert.match(html, /<label for="zcat">נושא<\/label>/);
  assert.match(html, /<select id="zcat">/);
  assert.match(html, /<option value="">כל הכללים<\/option>/);
  assert.match(html, /<option value="goals">שערים והבקעה<\/option>/);
  assert.match(html, /<option value="fouls">עבירות ופנדלים<\/option>/);
  assert.match(html, /<option value="keeper">שוער ורחבה<\/option>/);
  assert.match(html, /<option value="movement">תנועה ומסירות<\/option>/);
  assert.match(html, /<label for="zq">חיפוש בכללי המשחק<\/label>/);
  assert.match(html, /<input id="zq" type="search"/);
  assert.match(html, /<button type="button" id="zcopy" class="ghost"/);
  assert.match(html, /<button type="button" id="zreset" class="ghost"/);
  assert.match(html, /<span id="zcopyStatus"/);
  assert.match(html, /<p class="muted" id="zoharStats" aria-live="polite"><\/p>/);
});

test('initial mount renders all 25 zohar rules and initial stats', async function () {
  const { $ } = await mount();
  assert.equal($('zoharStats').textContent, '25 כללים בחוקת כדור זוהר');
  assert.match($('zoharOut').innerHTML, /התנועה במגרש במסירות/);
  assert.match($('zoharOut').innerHTML, /שער עצמי בכל אופן וצורה/);
});

test('filtering by topic (zcat="goals") filters rules and updates stats', async function () {
  const { $ } = await mount();
  $('zcat').value = 'goals';
  $('zcat').fire('change');
  assert.match($('zoharStats').textContent, /כללים תואמים לסינון/);
  assert.match($('zoharOut').innerHTML, /כיבוש השער/);
  assert.match($('zoharOut').innerHTML, /שער עצמי/);
  assert.doesNotMatch($('zoharOut').innerHTML, /אסור לגדף \/לקלל/);
});

test('searching with text query (zq="שוער") filters rules', async function () {
  const { $ } = await mount();
  $('zq').value = 'שוער';
  $('zq').fire('input');
  assert.match($('zoharStats').textContent, /כללים תואמים לסינון/);
  assert.match($('zoharOut').innerHTML, /לשוער יש חוקים מקלים/);
  assert.doesNotMatch($('zoharOut').innerHTML, /אורך מחצית ברוטו/);
});

test('search with no matches shows accessible empty state', async function () {
  const { $ } = await mount();
  $('zq').value = 'שחמט שאינו קיים בחוקה';
  $('zq').fire('input');
  assert.equal($('zoharStats').textContent, '0 כללים תואמים לסינון');
  assert.match($('zoharOut').innerHTML, /לא נמצאו כללים התואמים את החיפוש/);
  assert.match($('zoharOut').innerHTML, /role="status"/);
});

test('pressing Escape in zq clears search and restores rules', async function () {
  const { $ } = await mount();
  $('zq').value = 'פנדל';
  $('zq').fire('input');
  assert.notEqual($('zoharStats').textContent, '25 כללים בחוקת כדור זוהר');

  $('zq').fire('keydown', { key: 'Escape' });
  assert.equal($('zq').value, '');
  assert.equal($('zoharStats').textContent, '25 כללים בחוקת כדור זוהר');
  assert.match($('zoharOut').innerHTML, /התנועה במגרש במסירות/);
});

test('clicking zreset clears filters and search, focuses zq', async function () {
  const { $ } = await mount();
  $('zcat').value = 'fouls';
  $('zq').value = 'פנדל';
  $('zcat').fire('change');
  $('zq').fire('input');

  $('zq').focused = false;
  $('zreset').fire('click');
  assert.equal($('zcat').value, '');
  assert.equal($('zq').value, '');
  assert.equal($('zoharStats').textContent, '25 כללים בחוקת כדור זוהר');
  assert.equal($('zq').focused, true);
});

test('clicking zcopy triggers clipboard copy and displays feedback message', async function () {
  const { $ } = await mount();
  $('zcopy').fire('click');
  assert.equal($('zcopyStatus').textContent, 'הועתק ללוח!');
});
