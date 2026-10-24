'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'manage.html'), 'utf8');
const TH = require('../js/core.js');
const THInfer = require('../js/infer.js');
const THIngest = require('../js/ingest.js');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/manage.html',
  pathname: '/TrainerHub/manage.html',
  hash: ''
};

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start !== -1 && end !== -1, 'manage.html has an inline script');
  return html.slice(start + '<script>'.length, end);
}

function selectOptions(id) {
  const m = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  assert.ok(m, 'select#' + id + ' exists');
  const values = [];
  m[1].replace(/<option value="([^"]+)"/g, function (_, v) { values.push(v); return _; });
  return values;
}

function makeSelect(id, multiple) {
  const options = selectOptions(id).map(function (v) { return { value: v, selected: false }; });
  const el = { id: id, options: options, handlers: {}, addEventListener: function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); } };
  if (!multiple) {
    Object.defineProperty(el, 'value', {
      get: function () { const hit = options.filter(function (o) { return o.selected; })[0]; return hit ? hit.value : options[0].value; },
      set: function (v) { options.forEach(function (o) { o.selected = o.value === v; }); }
    });
  }
  return el;
}

function harness(opts) {
  opts = opts || {};
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.setCatalog({});
  if (opts.userEntries) {
    opts.userEntries.forEach(function (entry) {
      TH.addUserEntry(entry);
    });
  }
  if (opts.wishes) {
    opts.wishes.forEach(function (name) {
      THIngest.wishlistAdd(name, 'נקלט מאימון מודבק בלי סרטון במאגר');
    });
  }
  const elements = {
    muscles: makeSelect('muscles', true),
    equipment: makeSelect('equipment', false),
    level: makeSelect('level', false)
  };
  const document = {
    getElementById: function (id) {
      if (!elements[id]) {
        elements[id] = { id: id, value: '', textContent: '', innerHTML: '', className: '', handlers: {},
          addEventListener: function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); } };
      }
      return elements[id];
    }
  };
  new Function('document', 'TH', 'THInfer', 'THIngest', inlineScript())(document, TH, THInfer, THIngest);
  function fire(id, ev, arg) {
    (elements[id].handlers[ev] || []).forEach(function (fn) { fn(arg || { preventDefault: function () {}, target: elements[id] }); });
  }
  return { el: elements, fire: fire };
}

test('manage.html has skip-link and valid Hebrew RTL language headers', function () {
  assert.match(html, /<html\s+lang="he"\s+dir="rtl">/);
  assert.match(html, /<a\s+class="skip-link"\s+href="#url">דלג לטופס ההוספה<\/a>/);
});

test('manage.html static markup: nav has accessible label, active page indicator and links to booklet', function () {
  assert.match(html, /<nav class="th-nav" aria-label="ניווט ראשי">/);
  assert.match(html, /<span class="chip on" aria-current="page">ניהול מאגר<\/span>/);
  assert.match(html, /<a href="\.\/booklet\.html">חוברת הקורס<\/a>/);
});

test('manage.html CSS: defines focus-visible outline for interactive controls', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*select:focus-visible,\s*textarea:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\)/);
});

test('manage.html static markup: addForm and landmarks have accessible labels and roles', function () {
  assert.match(html, /<form[^>]+id="addForm"[^>]+aria-labelledby="addFormHeading"/);
  assert.match(html, /<h2[^>]+id="addFormHeading">הוספת פריט<\/h2>/);
  assert.match(html, /<button[^>]+type="submit"[^>]+aria-label="אשר ושמור פריט במאגר המקומי"/);
  assert.match(html, /<button[^>]+id="previewBtn"[^>]+aria-label="הצג הצעת סיווג לפי שם התרגיל"/);

  assert.match(html, /<section[^>]+role="region"[^>]+aria-labelledby="userCatalogHeading"/);
  assert.match(html, /<h2[^>]+id="userCatalogHeading">פריטים שנוספו בדפדפן הזה<\/h2>/);
  assert.match(html, /<button[^>]+id="exportBtn"[^>]+aria-label="ייצוא פריטי המאגר המקומי כ־JSON להדבקה בקטלוג"/);
  assert.match(html, /<textarea[^>]+id="exportBox"[^>]+aria-label="קוד JSON מיוצא להדבקה בקטלוג"/);

  assert.match(html, /<section[^>]+role="region"[^>]+aria-labelledby="wishlistHeading"/);
  assert.match(html, /<h2[^>]+id="wishlistHeading">סרטונים שכדאי לצלם<\/h2>/);
});

test('manage.html dynamic userList: renders delete buttons with aria-label per item and role=status for empty state', function () {
  const emptyHarness = harness();
  assert.match(emptyHarness.el.userList.innerHTML, /<p class="hint"[^>]*role="status"[^>]*>עדיין לא הוספתם פריט/);

  const populatedHarness = harness({
    userEntries: [
      { id: 'custom-side-plank', he: 'פלאנק צידי מותאם', muscles: ['core'], equipment: ['none'], level: 'beginner', source: 'user' }
    ]
  });
  const htmlOut = populatedHarness.el.userList.innerHTML;
  assert.match(htmlOut, /data-del="custom-side-plank"/);
  assert.match(htmlOut, /aria-label="מחק את פלאנק צידי מותאם מהמאגר המקומי"/);
});

test('manage.html dynamic wishList: renders action buttons with aria-label per item and role=status for empty state', function () {
  const emptyHarness = harness();
  assert.match(emptyHarness.el.wishList.innerHTML, /<p class="hint"[^>]*role="status"[^>]*>אין כרגע תרגילים/);

  const populatedHarness = harness({
    wishes: ['ספרינט בעלייה']
  });
  const htmlOut = populatedHarness.el.wishList.innerHTML;
  assert.match(htmlOut, /data-wish-fill="ספרינט בעלייה"/);
  assert.match(htmlOut, /aria-label="הוסף סרטון עבור ספרינט בעלייה"/);
  assert.match(htmlOut, /data-wish-del="ספרינט בעלייה"/);
  assert.match(htmlOut, /aria-label="מחק את ספרינט בעלייה מרשימת התרגילים לצילום"/);
});
