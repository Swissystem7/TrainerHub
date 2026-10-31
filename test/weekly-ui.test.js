'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

function inlineScript() {
  const open = html.lastIndexOf('<script>');
  const close = html.indexOf('</script>', open);
  assert.ok(open >= 0 && close > open, 'weekly.html has an inline script');
  return html.slice(open + '<script>'.length, close);
}

function makeElement(id) {
  const attrs = {};
  const el = {
    id: id,
    value: '',
    textContent: '',
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = String(v); },
    className: '',
    listeners: {},
    parentNode: null,
    addEventListener: function (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    fire: function (type, evt) {
      const e = Object.assign({ target: el, preventDefault: function () {} }, evt || {});
      (this.listeners[type] || []).forEach(function (fn) { fn(e); });
    },
    click: function () { this.fire('click'); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    setAttribute: function (k, v) { attrs[k] = String(v); },
    removeAttribute: function (k) { delete attrs[k]; },
    closest: function () { return null; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    insertAdjacentHTML: function (pos, txt) { this._innerHTML += txt; }
  };
  return el;
}

function sampleProgram() {
  return {
    programId: 'prog_weekly_ui',
    durationWeeks: 1,
    dailyWorkouts: [
      {
        day: 1,
        split: 'push',
        exercises: [
          { name: 'שכיבות סמיכה', reps: '10', sets: 3, rest_seconds: 45 }
        ]
      },
      {
        day: 2,
        split: 'pull',
        exercises: [
          { name: 'מתח', reps: '8', sets: 3, rest_seconds: 60 }
        ]
      }
    ]
  };
}

function loadPage(opts) {
  opts = opts || {};
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const byId = {};
  const $ = function (id) {
    if (!byId[id]) byId[id] = makeElement(id);
    return byId[id];
  };

  const loc = { href: 'https://swissystem7.github.io/TrainerHub/weekly.html' };
  const mockWin = {
    location: loc,
    __lastProgram: opts.program || null,
    __lastMeta: opts.meta || null
  };

  const doc = {
    getElementById: $,
    querySelectorAll: function () { return []; }
  };

  const run = new Function('document', 'TH', 'window', inlineScript());
  run(doc, TH, mockWin);

  return {
    $: $,
    window: mockWin,
    location: loc
  };
}

test('weekly.html static markup: nav has accessible label, active page indicator and links to booklet', function () {
  assert.match(html, /<nav class="th-nav" aria-label="ניווט ראשי">/);
  assert.match(html, /<span class="chip on" aria-current="page">בונה שבועי<\/span>/);
  assert.match(html, /<a href="\.\/booklet\.html">חוברת הקורס<\/a>/);
});

test('weekly.html static markup: landmark regions, labels, empty state and toolbars', function () {
  assert.match(html, /<form class="card" id="form" role="region" aria-labelledby="formHeading">/);
  assert.match(html, /<h2 id="formHeading">העדפות מתאמן<\/h2>/);
  assert.match(html, /<div class="actions" role="toolbar" aria-label="פעולות טופס תוכנית שבועית">/);
  assert.match(html, /<button type="submit" class="th-btn" id="buildBtn" aria-label="בנה תוכנית אימונים שבועית מהמאגר">בנה אימון<\/button>/);
  assert.match(html, /<button type="button" class="th-btn ghost" id="resetBtn" aria-label="נקה נתוני טופס והחזר לברירת מחדל">נקה<\/button>/);
  assert.match(html, /<div class="card" id="result" role="region" aria-label="תוצאת תוכנית שבועית" aria-live="polite">/);
  assert.match(html, /<p class="empty" role="status">בחרו את העדפות המתאמן ולחצו «בנה אימון» כדי להפיק תוכנית שבועית מותאמת\.<\/p>/);
});

test('weekly.html CSS: focus-visible outline and empty state styles', function () {
  assert.match(html, /button:focus-visible,\s*select:focus-visible,\s*input:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
  assert.match(html, /\.empty\s*\{\s*color:\s*var\(--muted\);/);
});

test('weekly.html dynamic: resetBtn clears form to defaults and restores initial empty state', function () {
  const page = loadPage();
  page.$('muscle').value = 'chest';
  page.$('goal').value = 'hypertrophy';
  page.$('level').value = 'advanced';
  page.$('equipment').value = 'dumbbells';
  page.$('audience').value = 'kids';
  page.$('days').value = '5';
  page.window.__lastProgram = sampleProgram();
  page.window.__lastMeta = { equipment: ['משקולות'] };
  page.$('result').innerHTML = '<section class="day"><h3>אימון 1</h3></section>';

  page.$('resetBtn').click();

  assert.equal(page.$('muscle').value, 'full');
  assert.equal(page.$('goal').value, 'strength');
  assert.equal(page.$('level').value, 'beginner');
  assert.equal(page.$('equipment').value, 'none');
  assert.equal(page.$('audience').value, 'general');
  assert.equal(page.$('days').value, '3');
  assert.equal(page.window.__lastProgram, null);
  assert.equal(page.window.__lastMeta, null);
  assert.match(page.$('result').innerHTML, /<p class="empty" role="status">בחרו את העדפות המתאמן ולחצו «בנה אימון» כדי להפיק תוכנית שבועית מותאמת\.<\/p>/);
});

test('weekly.html dynamic: renderProgram handles null or empty dailyWorkouts with accessible status', function () {
  const page = loadPage();
  const runScript = new Function('document', 'TH', 'window', inlineScript() + '; return renderProgram;');
  const renderProgramFn = runScript({ getElementById: page.$ }, TH, page.window);

  renderProgramFn(null);
  assert.match(page.$('result').innerHTML, /<p class="empty" role="status">לא נמצאו אימונים מתאימים להעדפות שנבחרו/);

  renderProgramFn({ dailyWorkouts: [] });
  assert.match(page.$('result').innerHTML, /<p class="empty" role="status">לא נמצאו אימונים מתאימים להעדפות שנבחרו/);
});

test('weekly.html dynamic: renderProgram creates day sections with actions toolbar and accessible labels', function () {
  const page = loadPage();
  const runScript = new Function('document', 'TH', 'window', inlineScript() + '; return renderProgram;');
  const renderProgramFn = runScript({ getElementById: page.$ }, TH, page.window);

  const prog = sampleProgram();
  page.window.__lastProgram = prog;
  page.window.__lastMeta = { equipment: ['משקל גוף'], intensity: 'medium', tags: [] };

  renderProgramFn(prog);
  const out = page.$('result').innerHTML;

  assert.match(out, /<section class="day">/);
  assert.match(out, /<div class="actions" role="toolbar" aria-label="פעולות עבור אימון 1 \(דחיפה\)">/);
  assert.match(out, /aria-label="התחל אימון 1 \(דחיפה\) במצב אימון חי"/);
  assert.match(out, /aria-label="פתח כמתאמן עבור אימון 1 \(דחיפה\)"/);
  assert.match(out, /aria-label="שתף אימון ללקוח עבור אימון 1 \(דחיפה\)"/);
  assert.match(out, /aria-label="דף להדפסה \/ PDF עבור אימון 1 \(דחיפה\)"/);
  assert.match(out, /<div class="th-gate-host"><\/div><\/section>/);
});
