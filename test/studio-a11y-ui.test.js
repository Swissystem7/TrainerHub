'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');
const TH = require('../js/core.js');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start !== -1 && end !== -1, 'frontend/index.html has an inline script');
  return html.slice(start + '<script>'.length, end);
}

test('frontend/index.html static markup: action bar, panels and landmarks have accessible roles and labels', function () {
  // Action bar toolbar
  assert.match(html, /<div class="action-bar"[^>]+role="toolbar"[^>]+aria-label="פעולות כרטיסיית אימון"/);
  assert.match(html, /<button[^>]+id="startBtn"[^>]+aria-label="התחל אימון במצב חי"/);
  assert.match(html, /<button[^>]+id="previewBtn"[^>]+aria-label="פתח קישור אימון לתצוגת מתאמן"/);
  assert.match(html, /<button[^>]+id="shareBtn"[^>]+aria-label="שתף אימון ללקוח"/);
  assert.match(html, /<button[^>]+id="pdfBtn"[^>]+aria-label="דף להדפסה או שמירה כ־PDF"/);
  assert.match(html, /<button[^>]+id="saveBtn"[^>]+aria-label="שמור אימון במאגר המקומי בדפדפן"/);
  assert.match(html, /<button[^>]+id="jsonBtn"[^>]+aria-label="ייצא מבנה אימון כ־JSON"/);
  assert.match(html, /<button[^>]+id="copyBtn"[^>]+aria-label="העתק טקסט אימון ללוח"/);

  // Examples group
  assert.match(html, /<div role="group" aria-label="דוגמאות אימון למילוי מהיר"/);
  assert.match(html, /data-ex="1"[^>]+aria-label="טען דוגמה: אימון פונקציונלי"/);
  assert.match(html, /data-ex="2"[^>]+aria-label="טען דוגמה: אימון כוח"/);
  assert.match(html, /data-ex="3"[^>]+aria-label="טען דוגמה: אימון HIIT"/);

  // Primary buttons and panels
  assert.match(html, /<button[^>]+id="parseBtn"[^>]+aria-label="המר תיאור אימון לכרטיסייה"/);
  assert.match(html, /<button[^>]+id="netanyaBtn"[^>]+aria-label="הוסף את חמשת אימוני הפתיחה של שלולית החורף נתניה למאגר השמור"/);
  assert.match(html, /<section class="panel" aria-labelledby="workoutInputLabel"/);
  assert.match(html, /<section class="panel" id="cardPanel" aria-labelledby="cardPanelHeading"/);
  assert.match(html, /<div class="card-empty" id="cardEmpty"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /<div id="historyList"[^>]+role="region"[^>]+aria-labelledby="historyTitle"/);
});

test('frontend/index.html CSS: focus-visible outline is defined for history items', function () {
  assert.match(html, /\.history-item:focus-visible\s*\{\s*outline:\s*2px solid #7c3aed;/);
});

function createHarness(savedEntries) {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  if (savedEntries) {
    TH.store.set(TH.KEYS.saved, savedEntries);
  }
  const elements = {};
  function makeElement(id) {
    return {
      id: id,
      value: '',
      textContent: '',
      innerHTML: '',
      hidden: false,
      handlers: {},
      addEventListener: function (ev, fn) {
        (this.handlers[ev] = this.handlers[ev] || []).push(fn);
      },
      querySelectorAll: function () { return []; }
    };
  }
  const doc = {
    getElementById: function (id) {
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    },
    querySelectorAll: function () { return []; }
  };

  const scriptSrc = inlineScript();
  const run = new Function('document', 'TH', 'WorkoutLibrary', 'NetanyaOpeningWorkouts', 'location', scriptSrc);
  run(doc, TH, { save: function () {} }, [], { href: '' });

  return {
    el: function (id) { return doc.getElementById(id); },
    fire: function (id, ev, eventObj) {
      const target = doc.getElementById(id);
      (target.handlers[ev] || []).forEach(function (fn) {
        fn(eventObj || { target: target, preventDefault: function () {} });
      });
    }
  };
}

test('frontend/index.html dynamic history: renders role=status on empty state', function () {
  const h = createHarness([]);
  assert.match(h.el('historyList').innerHTML, /<p class="honest" role="status">עדיין אין אימונים שמורים\.<\/p>/);
});

test('frontend/index.html dynamic history: renders role=button, tabindex=0, and aria-labels for loaded items', function () {
  const sample = [
    { title: 'אימון כוח עליון', savedAt: '2026-10-16 10:00', source_text: 'טקסט אימון' }
  ];
  const h = createHarness(sample);
  const out = h.el('historyList').innerHTML;
  assert.match(out, /class="history-item"[^>]+data-load="0"[^>]+role="button"[^>]+tabindex="0"[^>]+aria-label="טען אימון: אימון כוח עליון"/);
  assert.match(out, /class="history-del"[^>]+data-del="0"[^>]+aria-label="מחק את אימון כוח עליון מהאימונים השמורים"/);
});

test('frontend/index.html dynamic history: Enter/Space keydown on history item triggers workout load', function () {
  const sample = [
    { title: 'אימון פונקציונלי', savedAt: '2026-10-16 12:00', source_text: 'אימון פונקציונלי 20 דקות' }
  ];
  const h = createHarness(sample);

  let prevented = false;
  const mockItem = {
    hasAttribute: function (attr) { return attr === 'data-load'; },
    getAttribute: function (attr) { return attr === 'data-load' ? '0' : null; },
    closest: function (selector) {
      if (selector === '[data-load]') return mockItem;
      return null;
    }
  };

  h.fire('historyList', 'keydown', {
    key: 'Enter',
    target: mockItem,
    preventDefault: function () { prevented = true; }
  });

  assert.equal(prevented, true, 'preventDefault called on Enter keydown');
  assert.equal(h.el('workoutInput').value, 'אימון פונקציונלי 20 דקות');
});
