'use strict';

// booklet.html keeps the last previewed plan in `current` and «התחל במצב
// אימון» only rebuilt it when nothing had been previewed yet. The page
// previews the first option on load, so a coach who picked «אימון פתיחה 3»
// (or switched the season to winter) and pressed start without pressing
// «הצג אימון» first opened «אימון פתיחה 1» in workout mode. The start button
// now rebuilds from the controls, and changing a control refreshes the
// preview.

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

function lastActive(stored) {
  const hits = stored.filter(function (s) { return s.key === TH.KEYS.active; });
  assert.ok(hits.length, 'start stored an active workout');
  return hits[hits.length - 1].value;
}

test('«התחל במצב אימון» opens the plan selected now, not the one previewed on load', async function () {
  const page = await mount();
  page.$('plan').value = 'session:opening-3';
  page.$('start').click();
  const w = lastActive(page.stored);
  assert.equal(w.title, B.sessionWorkout('opening-3', { season: 'summer', activity: 'long' }).title);
  assert.notEqual(w.title, B.sessionWorkout('opening-1', {}).title);
  assert.match(page.location.href, /workout-mode\.html$/);
});

test('switching the season to winter before start lengthens the warm-up of the started plan', async function () {
  const page = await mount();
  page.$('season').value = 'winter';
  page.$('start').click();
  const w = lastActive(page.stored);
  const winter = B.sessionWorkout('opening-1', { season: 'winter', activity: 'long' });
  const summer = B.sessionWorkout('opening-1', { season: 'summer', activity: 'long' });
  assert.notEqual(winter.duration_minutes, summer.duration_minutes, 'fixture: season changes the plan');
  assert.equal(w.duration_minutes, winter.duration_minutes);
  assert.equal(w.phases[0].duration_minutes, winter.phases[0].duration_minutes);
});

test('changing the plan dropdown refreshes the preview without pressing «הצג אימון»', async function () {
  const page = await mount();
  assert.match(page.$('planOut').innerHTML, /אימון פתיחה 1/);
  page.$('plan').value = 'session:opening-2';
  page.$('plan').fire('change');
  assert.match(page.$('planOut').innerHTML, /אימון פתיחה 2/);
  assert.doesNotMatch(page.$('planOut').innerHTML, /אימון פתיחה 1/);
});

test('a method plan (IGO-UGO) starts as itself after switching from a session', async function () {
  const page = await mount();
  page.$('plan').value = 'method:igo-ugo:0';
  page.$('start').click();
  const w = lastActive(page.stored);
  assert.equal(w.title, B.methodWorkout('igo-ugo', 0, { season: 'summer', activity: 'long' }).title);
});
