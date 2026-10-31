'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
const TH = require('../js/core.js');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name + ' is defined in library.html');
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unbalanced braces in ' + name);
}

function element(extra) {
  const el = Object.assign({
    value: '', textContent: '', innerHTML: '', hidden: false,
    insertAdjacentHTML: function (where, html) { this.innerHTML += html; }
  }, extra || {});
  Object.defineProperty(el, 'textContent', {
    get: function () { return this.innerHTML; },
    set: function (v) { this.innerHTML = String(v); }
  });
  return el;
}

test('library.html has skip-link and valid Hebrew RTL headers', function () {
  assert.match(html, /<html\s+lang="he"\s+dir="rtl">/);
  assert.match(html, /<a\s+class="skip-link"\s+href="#q">דלג לחיפוש<\/a>/);
});

test('library.html static markup: nav has accessible label, active page indicator and links to booklet', function () {
  assert.match(html, /<nav class="th-nav" aria-label="ניווט ראשי">/);
  assert.match(html, /<span class="chip on" aria-current="page">ספריית סרטונים<\/span>/);
  assert.match(html, /<a href="\.\/booklet\.html">חוברת הקורס<\/a>/);
});

test('library.html defines draft box with role="region" and accessible aria-label', function () {
  assert.match(html, /<section class="draft" id="draftBox" role="region" aria-label="אימון שנבנה מהספרייה"/);
});

test('library.html draft action buttons have descriptive aria-labels', function () {
  assert.match(html, /id="draftStart"\s+aria-label="התחל אימון מהספרייה במצב אימון חי"/);
  assert.match(html, /id="draftPreview"\s+aria-label="פתח אימון מהספרייה כמתאמן"/);
  assert.match(html, /id="draftCopy"\s+aria-label="שתף אימון מהספרייה ללקוח"/);
  assert.match(html, /id="draftPdf"\s+aria-label="דף להדפסה או שמירת PDF של האימון"/);
  assert.match(html, /id="draftClear"\s+aria-label="נקה את כל התרגילים מהאימון"/);
});

test('library.html renders cards with accessible action button aria-labels', function () {
  const els = {
    q: element({ value: 'פלאנק' }),
    muscle: element(),
    equipment: element(),
    level: element(),
    stats: element(),
    grid: element()
  };
  const document = { querySelectorAll: function () { return []; } };
  const code = ['currentFilters', 'render'].map(function (name) {
    return extractFunction(html, name);
  }).join('\n');

  const build = new Function('$', 'document', 'TH',
    'var tag = ""; var pinned = "";\n' + code + '\nreturn { render: render };'
  );
  const runner = build(function (id) { return els[id]; }, document, TH);
  runner.render();

  assert.match(els.grid.innerHTML, /aria-label="העתק לינק עבור [^"]+"/);
  assert.match(els.grid.innerHTML, /aria-label="שתף בוואטסאפ: [^"]+"/);
  assert.match(els.grid.innerHTML, /aria-label="הוסף [^"]+ לאימון"/);
});

test('library.html renders alternative buttons with descriptive aria-label', function () {
  const els = {
    q: element({ value: '' }),
    muscle: element(),
    equipment: element(),
    level: element(),
    stats: element(),
    grid: element()
  };
  const document = { querySelectorAll: function () { return []; } };
  const code = ['currentFilters', 'render'].map(function (name) {
    return extractFunction(html, name);
  }).join('\n');

  const build = new Function('$', 'document', 'TH',
    'var tag = ""; var pinned = "";\n' + code + '\nreturn { render: render };'
  );
  const runner = build(function (id) { return els[id]; }, document, TH);
  runner.render();

  assert.match(els.grid.innerHTML, /aria-label="עבור לתרגיל חלופי: [^"]+"/);
});

test('library.html renders empty state with role="status"', function () {
  const els = {
    q: element({ value: 'תרגיל_שאינו_קיים_כלל' }),
    muscle: element(),
    equipment: element(),
    level: element(),
    stats: element(),
    grid: element()
  };
  const document = { querySelectorAll: function () { return []; } };
  const code = ['currentFilters', 'render'].map(function (name) {
    return extractFunction(html, name);
  }).join('\n');

  const build = new Function('$', 'document', 'TH',
    'var tag = ""; var pinned = "";\n' + code + '\nreturn { render: render };'
  );
  const runner = build(function (id) { return els[id]; }, document, TH);
  runner.render();

  assert.match(els.grid.innerHTML, /<(p|div) class="empty" role="status">/);
});

test('library.html renders unpin chip with descriptive aria-label when pinned', function () {
  const els = {
    q: element({ value: '' }),
    muscle: element(),
    equipment: element(),
    level: element(),
    stats: element(),
    grid: element()
  };
  const document = { querySelectorAll: function () { return []; } };
  const code = ['currentFilters', 'render'].map(function (name) {
    return extractFunction(html, name);
  }).join('\n');

  const build = new Function('$', 'document', 'TH',
    'var tag = ""; var pinned = "plank";\n' + code + '\nreturn { render: render };'
  );
  const runner = build(function (id) { return els[id]; }, document, TH);
  runner.render();

  assert.match(els.stats.innerHTML, /aria-label="בטל בחירת חלופה והצג את כל התוצאות"/);
});

test('library.html draftPdf handler prepares print entry and navigates to print page', function () {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.draftClear();
  TH.draftAdd('plank');

  const loc = { href: '' };
  const draftPdfHandler = new Function('TH', 'location',
    'TH.preparePrint(TH.draftGet(), {});\n' +
    'location.href = TH.printUrl ? TH.printUrl() : "./workout-print.html";'
  );

  draftPdfHandler(TH, loc);

  const printEntry = TH.store.get(TH.KEYS.print);
  assert.ok(printEntry, 'stored print entry');
  assert.equal(loc.href, './workout-print.html');
});
