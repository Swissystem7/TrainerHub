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
  const attrs = {};
  const el = {
    id: id,
    value: '',
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
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type) { (handlers[type] || []).forEach(function (fn) { fn({ target: el, preventDefault: function () {} }); }); },
    click: function () { this.fire('click'); },
    getAttribute: function (k) { return attrs[k] != null ? attrs[k] : null; },
    setAttribute: function (k, v) { attrs[k] = String(v); }
  };
  return el;
}

async function mount() {
  const elements = {};
  const document = {
    getElementById: function (id) {
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    }
  };
  const stored = [];
  const location = { href: 'booklet.html' };
  const th = Object.assign({}, TH, {
    store: { get: TH.store.get, remove: TH.store.remove, set: function (k, v) { stored.push({ key: k, value: v }); return true; } }
  });
  const run = new Function('document', 'TH', 'THBooklet', 'location', inlineScript());
  run(document, th, B, location);
  await new Promise(function (r) { setImmediate(r); });
  return {
    $: document.getElementById,
    stored: stored,
    location: location
  };
}

test('booklet.html static: actions toolbar and action buttons have accessible roles and labels', function () {
  assert.match(html, /<div class="actions"[^>]+role="toolbar"[^>]+aria-label="פעולות מערך אימון מהחוברת"/);
  assert.match(html, /<button type="button" id="start">התחל במצב אימון<\/button>/);
  assert.match(html, /<button type="button" id="previewTrainee" class="ghost">פתח כמתאמן<\/button>/);
  assert.match(html, /<button type="button" id="share" class="ghost">שתף אימון ללקוח<\/button>/);
  assert.match(html, /<button type="button" id="pdf" class="ghost">דף להדפסה \/ PDF<\/button>/);
  assert.match(html, /<button type="button" id="preview" class="ghost">הצג אימון<\/button>/);
});

test('booklet.html static: drill search input, live stats, and results container have accessible attributes', function () {
  assert.match(html, /<input id="dq" type="search"[^>]+aria-label="חיפוש בבנק התרגילים"[^>]+aria-controls="drillOut"/);
  assert.match(html, /<p class="muted" id="drillStats"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /<div class="grid" id="drillOut"[^>]+role="region"[^>]+aria-label="תוצאות בנק תרגילים"/);
});

test('booklet.html static: fitness calculator and safety print buttons have accessible labels', function () {
  assert.match(html, /<button type="button" id="score"[^>]+aria-label="חשב ציון בבוחן כושר"/);
  assert.match(html, /<button type="button"[^>]+aria-label="הדפס את תיק הבטיחות"[^>]*>הדפס את התיק<\/button>/);
});

test('booklet.html CSS: focus-visible outline is defined for interactive controls', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*select:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
});

test('booklet.html dynamic: drill search with no matching results renders empty state with role=status', async function () {
  const page = await mount();
  page.$('dq').value = 'חיפוש שאין לו שום תוצאות במאגר';
  page.$('dq').fire('input');
  assert.match(page.$('drillStats').textContent, /0 תרגילים/);
  assert.match(page.$('drillOut').innerHTML, /<p class="muted" role="status">לא נמצאו תרגילים התואמים את החיפוש\.<\/p>/);
});

test('booklet.html dynamic: fitness scoring renders weighted score with role=status', async function () {
  const page = await mount();
  page.$('f-pullups').value = '10';
  page.$('f-pushups').value = '30';
  page.$('f-plank').value = '2:00';
  page.$('f-run300').value = '0:55';
  page.$('f-run3k').value = '13:30';
  page.$('score').click();
  assert.match(page.$('fitnessOut').innerHTML, /<p class="total" role="status">ציון משוקלל:/);
});
