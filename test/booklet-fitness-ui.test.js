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
    get isFocused() { return focused; },
    focus: function () { focused = true; },
    blur: function () { focused = false; },
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type, event) {
      const evt = Object.assign({ target: el, preventDefault: function () {} }, event || {});
      (handlers[type] || []).forEach(function (fn) { fn(evt); });
    },
    click: function () { this.fire('click'); },
    keydown: function (key) { this.fire('keydown', { key: key }); },
    insertAdjacentHTML: function (pos, txt) { this._innerHTML += txt; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  return el;
}

function mount() {
  const elements = {};
  function getEl(id) {
    if (!elements[id]) elements[id] = makeElement(id);
    return elements[id];
  }
  const document = {
    getElementById: getEl
  };
  const location = { href: 'https://swissystem7.github.io/TrainerHub/booklet.html' };
  const fn = new Function('TH', 'THBooklet', 'document', 'location', inlineScript());
  fn(TH, B, document, location);
  return { get: getEl, elements: elements };
}

test('fitness section markup declares toolbar, reset button, and input placeholders', function () {
  assert.match(html, /<div class="actions" role="toolbar" aria-label="פעולות מחשבון בוחן כושר">/);
  assert.match(html, /<button type="button" id="score" aria-label="חשב ציון בבוחן כושר">חשב ציון<\/button>/);
  assert.match(html, /<button type="button" class="ghost" id="fitnessReset" aria-label="נקה נתוני בוחן כושר">נקה טופס<\/button>/);
  assert.match(html, /<input id="f-pullups"[^>]*placeholder="למשל: 10"/);
  assert.match(html, /<input id="f-pushups"[^>]*placeholder="למשל: 25"/);
});

test('scoreNow with empty inputs shows accessible validation status message', function () {
  const app = mount();
  const scoreBtn = app.get('score');
  const out = app.get('fitnessOut');

  scoreBtn.click();
  assert.match(out.innerHTML, /role="status"/);
  assert.match(out.innerHTML, /הזינו לפחות תוצאה אחת/);
  assert.doesNotMatch(out.innerHTML, /ציון משוקלל: 0/);
});

test('scoreNow with valid results renders score table and weighted total', function () {
  const app = mount();
  app.get('f-sex').value = 'male';
  app.get('f-pullups').value = '12';
  app.get('f-pushups').value = '30';
  app.get('f-plank').value = '2:00';
  app.get('f-run300').value = '0:55';
  app.get('f-run3k').value = '13:31';

  app.get('score').click();
  const out = app.get('fitnessOut');
  assert.match(out.innerHTML, /<table>/);
  assert.match(out.innerHTML, /ציון משוקלל: 75/);
});

test('fitnessReset button clears all inputs, clears output, and focuses pullups input', function () {
  const app = mount();
  app.get('f-pullups').value = '10';
  app.get('f-pushups').value = '20';
  app.get('f-plank').value = '1:30';
  app.get('f-run300').value = '1:05';
  app.get('f-run3k').value = '15:00';
  app.get('score').click();

  assert.ok(app.get('fitnessOut').innerHTML.length > 0);

  app.get('fitnessReset').click();

  assert.equal(app.get('f-pullups').value, '');
  assert.equal(app.get('f-pushups').value, '');
  assert.equal(app.get('f-plank').value, '');
  assert.equal(app.get('f-run300').value, '');
  assert.equal(app.get('f-run3k').value, '');
  assert.equal(app.get('fitnessOut').innerHTML, '');
  assert.equal(app.get('f-pullups').isFocused, true);
});

test('pressing Enter in any fitness input field triggers calculation', function () {
  const app = mount();
  app.get('f-sex').value = 'male';
  app.get('f-pullups').value = '15';

  app.get('f-pullups').keydown('Enter');
  assert.match(app.get('fitnessOut').innerHTML, /<table>/);
  assert.match(app.get('fitnessOut').innerHTML, /ציון משוקלל/);

  app.get('fitnessReset').click();
  assert.equal(app.get('fitnessOut').innerHTML, '');

  app.get('f-pushups').value = '25';
  app.get('f-pushups').keydown('Enter');
  assert.match(app.get('fitnessOut').innerHTML, /<table>/);
});
