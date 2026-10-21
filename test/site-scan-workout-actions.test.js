'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const B = require('../js/booklet.js');
const SP = require('../js/site-profile.js');
const Plan = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'site-scan.html'), 'utf8');
const main = JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8'));
const team = JSON.parse(fs.readFileSync(path.join(root, B.TEAM_PATH), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));

B.setData(main, team);
TH.setCatalog(catalog);

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start !== -1 && end !== -1, 'site-scan.html has an inline script');
  return html.slice(start + '<script>'.length, end);
}

function makeElement(id) {
  const handlers = {};
  const el = {
    id: id,
    value: id === 'group' ? '12' : (id === 'season' ? 'summer' : ''),
    textContent: '',
    _hidden: id === 'start' || id === 'scanActions',
    get hidden() { return this._hidden; },
    set hidden(v) { this._hidden = !!v; },
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = String(v); },
    scrollIntoView: function () {},
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

async function mount() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const elements = {};
  const document = {
    getElementById: function (id) {
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    },
    activeElement: null
  };
  const stored = [];
  const location = { href: 'https://swissystem7.github.io/TrainerHub/site-scan.html' };
  global.location = location;
  const th = Object.assign({}, TH, {
    store: {
      get: TH.store.get,
      remove: TH.store.remove,
      set: function (k, v) {
        stored.push({ key: k, value: v });
        return TH.store.set(k, v);
      }
    }
  });
  const run = new Function('document', 'TH', 'THBooklet', 'THSiteProfile', 'THSitePlan', 'location', inlineScript());
  run(document, th, B, SP, Plan, location);
  await new Promise(function (r) { setImmediate(r); });
  return { $: document.getElementById, stored: stored, location: location };
}

test('site-scan.html declares action buttons in #build for all builder paths', function () {
  assert.match(html, /<button type="button" id="start"[^>]*>התחל במצב אימון<\/button>/);
  assert.match(html, /<button type="button" id="previewTrainee" class="ghost">פתח כמתאמן<\/button>/);
  assert.match(html, /<button type="button" id="share" class="ghost">שתף אימון ללקוח<\/button>/);
  assert.match(html, /<button type="button" id="pdf" class="ghost">דף להדפסה \/ PDF<\/button>/);
  assert.match(html, /id="scanGateHost"/);
  assert.match(html, /id="scanActions"/);
});

test('before build, scanActions is hidden; after build, scanActions is visible', async function () {
  const page = await mount();
  assert.equal(page.$('scanActions').hidden, true);
  page.$('build').click();
  assert.equal(page.$('scanActions').hidden, false);
});

test('«פתח כמתאמן» sets location.href to encoded trainee workout link', async function () {
  const page = await mount();
  page.$('build').click();
  page.$('previewTrainee').click();
  assert.match(page.location.href, /#TH\./, 'contains encoded workout link');
  assert.match(page.location.href, /workout-mode\.html/);
});

test('«דף להדפסה / PDF» stores printable workout and navigates to workout-print.html', async function () {
  const page = await mount();
  page.$('build').click();
  page.$('pdf').click();
  const printEntry = TH.store.get(TH.KEYS.print);
  assert.ok(printEntry, 'stored print entry');
  assert.ok(printEntry.workout && printEntry.workout.title, 'workout has title');
  assert.equal(page.location.href, TH.printUrl());
});

test('«שתף אימון ללקוח» shows the share gate when unentitled', async function () {
  const page = await mount();
  page.$('build').click();
  page.$('share').click();
  assert.match(page.$('scanGateHost').innerHTML, /th-gate/, 'rendered gate markup in scanGateHost');
});

test('«נקה והתחל מחדש» hides scanActions and clears scanGateHost', async function () {
  const page = await mount();
  page.$('build').click();
  assert.equal(page.$('scanActions').hidden, false);
  page.$('share').click();
  assert.match(page.$('scanGateHost').innerHTML, /th-gate/);

  page.$('reset').click();
  assert.equal(page.$('scanActions').hidden, true);
  assert.equal(page.$('scanGateHost').innerHTML, '');
});
