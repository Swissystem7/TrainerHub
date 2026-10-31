'use strict';

// «שתף אימון ללקוח» flips to «הועתק» for 1.4 s. A second tap inside that window
// used to save «הועתק» as the label to restore, so the button said «הועתק» for good.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const B = require('../js/booklet.js');
const SP = require('../js/site-profile.js');
const Plan = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const main = JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8'));
const team = JSON.parse(fs.readFileSync(path.join(root, B.TEAM_PATH), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
B.setData(main, team);
TH.setCatalog(catalog);

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

function inlineScript(html) {
  const start = html.lastIndexOf('<script>');
  return html.slice(start + '<script>'.length, html.indexOf('</script>', start));
}

function fakeClock() {
  let now = 0;
  let next = 1;
  const timers = new Map();
  return {
    setTimeout: function (fn, ms) { timers.set(next, { fn: fn, at: now + ms }); return next++; },
    clearTimeout: function (id) { timers.delete(id); },
    tick: function (ms) {
      now += ms;
      Array.from(timers.entries())
        .filter(function (e) { return e[1].at <= now; })
        .sort(function (a, b) { return a[1].at - b[1].at; })
        .forEach(function (e) { timers.delete(e[0]); e[1].fn(); });
    }
  };
}

function makeElement(id, label) {
  const handlers = {};
  const el = {
    id: id,
    value: id === 'group' ? '12' : (id === 'season' ? 'summer' : ''),
    textContent: label || '',
    hidden: false,
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) {
      this._innerHTML = String(v);
      // booklet.html fills #plan with options; a real select then holds the first one.
      const first = id === 'plan' && /<option value="([^"]*)"/.exec(this._innerHTML);
      if (first && !this.value) this.value = first[1];
    },
    scrollIntoView: function () {},
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    click: function () { (handlers.click || []).forEach(function (fn) { fn({ target: el, preventDefault: function () {} }); }); },
    insertAdjacentHTML: function (pos, txt) { this.innerHTML += txt; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    closest: function () { return null; }
  };
  return el;
}

// Share is entitled and the clipboard write succeeds at once.
function th() {
  return Object.assign({}, TH, {
    shareToClient: function () { return { ok: true, url: 'https://example.test/#TH.x' }; },
    copyOrShow: function (text, anchor, onOk) { onOk(); return Promise.resolve({ ok: true }); }
  });
}

function mountPage(file, names, extra) {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const elements = { share: makeElement('share', 'שתף אימון ללקוח') };
  const document = {
    getElementById: function (id) { return elements[id] || (elements[id] = makeElement(id)); },
    activeElement: null
  };
  const clock = fakeClock();
  const location = { href: 'https://swissystem7.github.io/TrainerHub/' + file };
  const run = new Function('document', 'TH', 'location', 'setTimeout', 'clearTimeout', ...names, inlineScript(read(file)));
  run(document, th(), location, clock.setTimeout, clock.clearTimeout, ...extra);
  return { $: document.getElementById, clock: clock };
}

function assertDoubleTapRestores(page, build) {
  build();
  const btn = page.$('share');
  btn.click();
  assert.equal(btn.textContent, 'הועתק');
  page.clock.tick(500);
  btn.click();
  assert.equal(btn.textContent, 'הועתק');
  page.clock.tick(1400);
  assert.equal(btn.textContent, 'שתף אימון ללקוח', 'the label comes back after a double tap');
  btn.click();
  page.clock.tick(1400);
  assert.equal(btn.textContent, 'שתף אימון ללקוח');
}

test('site-scan «שתף אימון ללקוח» gets its label back after two quick taps', async function () {
  const page = mountPage('site-scan.html', ['THBooklet', 'THSiteProfile', 'THSitePlan'], [B, SP, Plan]);
  await new Promise(function (r) { setImmediate(r); });
  assertDoubleTapRestores(page, function () { page.$('build').click(); });
});

test('booklet «שתף אימון ללקוח» gets its label back after two quick taps', async function () {
  const page = mountPage('booklet.html', ['THBooklet'], [B]);
  await new Promise(function (r) { setImmediate(r); });
  assertDoubleTapRestores(page, function () {});
});

test('weekly day share button gets its label back after two quick taps', async function () {
  const html = read('weekly.html');
  const src = html.slice(html.indexOf('function copyDayTraineeLink('), html.indexOf('function printDayWorkout('));
  const clock = fakeClock();
  const result = makeElement('result');
  const window = { __lastProgram: { dailyWorkouts: [{ day: 1, exercises: [] }] }, __lastMeta: {} };
  const t = Object.assign(th(), { toPhasesWorkout: function () { return { title: 'יום 1', phases: [] }; } });
  const copy = new Function('TH', 'window', '$', 'setTimeout', 'clearTimeout', src + '\nreturn copyDayTraineeLink;')(
    t, window, function () { return result; }, clock.setTimeout, clock.clearTimeout);
  const btn = makeElement('dayShare', 'שתף ללקוח');
  copy(0, btn);
  clock.tick(500);
  copy(0, btn);
  assert.equal(btn.textContent, 'הועתק');
  clock.tick(1400);
  assert.equal(btn.textContent, 'שתף ללקוח');
});
