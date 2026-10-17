'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const TH = require('../js/core.js');
const THEngine = require('../js/session-builder.js');
const THPrompt = require('../js/prompt-parser.js');
const THIngest = require('../js/ingest.js');
TH.setCatalog(JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8')));

test('index.html static markup: mode tabs, examples, toolbars and form buttons have accessible labels and roles', function () {
  // Mode tabs & tablist
  assert.match(html, /<div class="modes"[^>]+role="tablist"[^>]+aria-label="מצב בנייה"/);
  assert.match(html, /<button[^>]+id="tab-prompt"[^>]+aria-label="בנייה לפי בקשה"/);
  assert.match(html, /<button[^>]+id="tab-ingest"[^>]+aria-label="הדבקת אימון קיים"/);
  assert.match(html, /<button[^>]+id="tab-seg"[^>]+aria-label="פירוק סרטון דרייב למקטעים"/);

  // Examples group & buttons
  assert.match(html, /<div class="examples"[^>]+role="group"[^>]+aria-label="דוגמאות אימון למילוי מהיר"/);
  assert.match(html, /data-fill="אימון בטן 20 דקות בלי ציוד"[^>]+aria-label="מלא דוגמה: אימון בטן 20 דקות בלי ציוד"/);
  assert.match(html, /data-fill="פול בודי עם גומיות, מתחיל"[^>]+aria-label="מלא דוגמה: פול בודי עם גומיות, מתחיל"/);
  assert.match(html, /data-fill="כוח גב 30 דקות"[^>]+aria-label="מלא דוגמה: כוח גב 30 דקות"/);
  assert.match(html, /data-fill="ידיים בלי ציוד, ביניים"[^>]+aria-label="מלא דוגמה: ידיים בלי ציוד, ביניים"/);

  // Form submit buttons
  assert.match(html, /<button type="submit" class="go"[^>]+aria-label="בנה אימון מהמאגר לפי ההגדרות">בנה אימון<\/button>/);
  assert.match(html, /<button type="submit" class="go"[^>]+aria-label="פרק את הטקסט המודבק לתרגילים">פרק לתרגילים<\/button>/);
  assert.match(html, /<button type="submit" class="go"[^>]+aria-label="שמור מקטע תרגיל במאגר המקומי">שמור מקטע במאגר<\/button>/);

  // Video segment tracking toolbar
  assert.match(html, /<div class="actions"[^>]+role="toolbar"[^>]+aria-label="פעולות מעקב סרטון"/);
  assert.match(html, /<button[^>]+id="segWatch"[^>]+aria-label="הצג סרטון בנגן"/);
  assert.match(html, /<button[^>]+id="segTrack"[^>]+aria-label="התחל מעקב זמן סרטון"/);
  assert.match(html, /<button[^>]+id="segMarkStart"[^>]+aria-label="סמן זמן התחלה של המקטע"/);
  assert.match(html, /<button[^>]+id="segMarkEnd"[^>]+aria-label="סמן זמן סיום של המקטע"/);

  // Result container region
  assert.match(html, /<div id="result"[^>]+role="region"[^>]+aria-label="תוצאת אימון"[^>]+aria-live="polite"/);
});

test('index.html CSS: focus-visible outline is defined for interactive controls', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*select:focus-visible,\s*textarea:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
});

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start !== -1 && end !== -1, 'index.html has an inline script');
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
    set innerHTML(v) { this._innerHTML = String(v); },
    hidden: false,
    tabIndex: 0,
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type, ev) { (handlers[type] || []).forEach(function (fn) { fn(ev || { target: el, preventDefault: function () {} }); }); },
    click: function () { this.fire('click'); },
    getAttribute: function (k) { return attrs[k] != null ? attrs[k] : null; },
    setAttribute: function (k, v) { attrs[k] = String(v); },
    removeAttribute: function (k) { delete attrs[k]; },
    focus: function () {},
    insertAdjacentHTML: function (pos, txt) { this._innerHTML += txt; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    options: []
  };
  el.parentNode = {
    parentNode: { querySelector: function () { return null; } },
    insertAdjacentHTML: function () {}
  };
  return el;
}

function createHarness() {
  const elements = {};
  const doc = {
    getElementById: function (id) {
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    },
    querySelectorAll: function () { return []; }
  };
  const location = { href: 'https://swissystem7.github.io/TrainerHub/' };

  const scriptSrc = inlineScript();
  const run = new Function('document', 'TH', 'THEngine', 'THPrompt', 'THIngest', 'location', scriptSrc);
  run(doc, TH, THEngine, THPrompt, THIngest, location);

  return {
    el: function (id) { return doc.getElementById(id); },
    fire: function (id, ev, eventObj) {
      doc.getElementById(id).fire(ev, eventObj);
    }
  };
}

test('index.html dynamic: empty ingest submission sets role=status on empty message', function () {
  const h = createHarness();
  h.el('ingestText').value = '   ';
  let prevented = false;
  h.fire('ingestForm', 'submit', { preventDefault: function () { prevented = true; } });
  assert.equal(prevented, true);
  assert.match(h.el('result').innerHTML, /<p class="empty" role="status">הדביקו אימון/);
});

test('index.html dynamic: workout actions toolbar renders with accessible roles and labels', function () {
  const h = createHarness();
  h.el('prompt').value = 'אימון בטן 20 דקות';
  h.el('durationInput').value = '20';
  h.el('participantsInput').value = '1';
  h.el('equipmentInput').value = 'none';

  h.fire('form', 'submit', { preventDefault: function () {} });
  const out = h.el('result').innerHTML;

  assert.match(out, /<div class="actions" role="toolbar" aria-label="פעולות אימון"/);
  assert.match(out, /<button type="button" class="th-btn" id="startBtn" aria-label="התחל אימון במצב חי">התחל אימון<\/button>/);
  assert.match(out, /<button type="button" class="th-btn ghost" id="previewBtn" aria-label="פתח קישור אימון לתצוגת מתאמן">פתח כמתאמן<\/button>/);
  assert.match(out, /<button type="button" class="th-btn ghost" id="copyBtn" aria-label="שתף אימון ללקוח">שתף אימון ללקוח<\/button>/);
  assert.match(out, /<button type="button" class="th-btn ghost" id="pdfBtn" aria-label="דף להדפסה או שמירה כ־PDF">דף להדפסה \/ PDF<\/button>/);
});
