'use strict';

// The booklet preview printed every duration in seconds, so the 20-minute
// relay of «אימון פתיחה 1» read «חלק א' – מרוץ שליחים — 1200 שנ׳». Whole
// minutes now read «20 דק׳», like the print sheet; Tabata's «20 שנ׳» and
// «מנוחה 10 שנ׳» stay in seconds.

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
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v);
      // A real <select> adopts its first option once options are rendered.
      if (id === 'plan') {
        const first = /<option value="([^"]*)"/.exec(this._innerHTML);
        if (first && !this.value) this.value = first[1];
      }
    },
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type) { (handlers[type] || []).forEach(function (fn) { fn({ target: el, preventDefault: function () {} }); }); },
    click: function () { this.fire('click'); }
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
  // Promise.all([TH.ready, B.load()]).then(...) resolves on the microtask queue.
  await new Promise(function (r) { setImmediate(r); });
  const $ = document.getElementById;
  assert.match($('plan').innerHTML, /session:opening-1/, 'plan options rendered');
  assert.equal($('plan').value, 'session:opening-1', 'first plan selected on load');
  return { $: $, stored: stored, location: location };
}

function rowOf(html, name) {
  const at = html.indexOf(name);
  assert.ok(at !== -1, 'preview lists ' + name);
  return html.slice(at, html.indexOf('</li>', at));
}

test('a 20-minute part of an opening session reads «20 דק׳», not «1200 שנ׳»', async function () {
  const page = await mount();
  const html = page.$('planOut').innerHTML;
  assert.doesNotMatch(html, /1200 שנ׳/);
  assert.match(rowOf(html, 'מרוץ שליחים'), /— 20 דק׳/);
});

test('a one-minute warm-up drill reads «1 דק׳»', async function () {
  const page = await mount();
  assert.match(rowOf(page.$('planOut').innerHTML, 'ריצה בהרמת בירכיים'), /— 1 דק׳/);
});

test('Tabata work and rest under a minute stay in seconds', async function () {
  const page = await mount();
  page.$('plan').value = 'method:tabata:0';
  page.$('plan').fire('change');
  assert.match(rowOf(page.$('planOut').innerHTML, 'מטפס'), /4 סבבים · 20 שנ׳ · מנוחה 10 שנ׳/);
});
