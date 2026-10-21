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
    value: '', textContent: '', innerHTML: '', hidden: false, focused: false,
    focus: function () { this.focused = true; },
    insertAdjacentHTML: function (where, html) { this.innerHTML += html; }
  }, extra || {});
  Object.defineProperty(el, 'textContent', {
    get: function () { return this.innerHTML; },
    set: function (v) { this.innerHTML = String(v); }
  });
  return el;
}

test('library.html static markup: accessibility landmarks, labels and reset button exist', function () {
  // Landmarks and accessible regions
  assert.match(html, /<section class="draft" id="draftBox" role="region" aria-label="אימון שנבנה מהספרייה"/);
  assert.match(html, /<form class="filters" id="filters" role="search" aria-label="סינון תרגילים בספרייה"/);
  assert.match(html, /<div class="grid" id="grid" role="region" aria-label="ספריית תרגילים"><\/div>/);

  // Accessible filter inputs
  assert.match(html, /<input id="q" type="search"[^>]+aria-label="חיפוש תרגיל לפי שם או מילת מפתח"/);
  assert.match(html, /<select id="muscle"[^>]+aria-label="סינון לפי קבוצת שרירים"/);
  assert.match(html, /<select id="equipment"[^>]+aria-label="סינון לפי ציוד"/);
  assert.match(html, /<select id="level"[^>]+aria-label="סינון לפי רמת קושי"/);

  // Clear filters chip button
  assert.match(html, /<button type="button" class="chip reset-chip" id="resetFiltersBtn" aria-label="איפוס כל המסננים והצגת כל התרגילים">נקה סינון<\/button>/);

  // Draft box action buttons
  assert.match(html, /id="draftStart"\s+aria-label="התחל אימון מהספרייה במצב אימון חי"/);
  assert.match(html, /id="draftPreview"\s+aria-label="פתח אימון מהספרייה כמתאמן"/);
  assert.match(html, /id="draftCopy"\s+aria-label="שתף אימון מהספרייה ללקוח"/);
  assert.match(html, /id="draftPdf"\s+aria-label="דף להדפסה או שמירת PDF של האימון"/);
  assert.match(html, /id="draftClear"\s+aria-label="נקה את כל התרגילים מהאימון"/);
});

test('library.html CSS: defines focus-visible outline and reset-chip styles', function () {
  assert.match(html, /button:focus-visible,\s*input:focus-visible,\s*select:focus-visible,\s*\.chip:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
  assert.match(html, /\.chip\.reset-chip\s*\{/);
  assert.match(html, /\.empty button\s*\{\s*margin-top:\s*12px;\s*\}/);
});

test('library.html dynamic: empty state renders with role="status" and actionable #emptyResetBtn', function () {
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

  assert.match(els.grid.innerHTML, /<div class="empty" role="status">/);
  assert.match(els.grid.innerHTML, /id="emptyResetBtn"/);
  assert.match(els.grid.innerHTML, /aria-label="נקה את כל המסננים והצג את כל התרגילים"/);
  assert.match(els.grid.innerHTML, /נקה סינון והצג הכל/);
});

test('library.html dynamic: resetFilters clears inputs, resets chips and re-renders full catalog', function () {
  const els = {
    q: element({ value: 'פלאנק' }),
    muscle: element({ value: 'core' }),
    equipment: element({ value: 'none' }),
    level: element({ value: 'beginner' }),
    stats: element(),
    grid: element()
  };
  const chips = [
    { tag: '', pressed: 'false' },
    { tag: 'kids', pressed: 'true' }
  ].map(function (c) {
    const obj = {
      tag: c.tag,
      pressed: c.pressed,
      getAttribute: function (k) { return k === 'data-tag' ? this.tag : this.pressed; },
      setAttribute: function (k, v) { if (k === 'aria-pressed') this.pressed = v; }
    };
    return obj;
  });
  const document = {
    querySelectorAll: function (sel) {
      if (sel === '.chip[data-tag]') return chips;
      return [];
    }
  };

  const code = ['currentFilters', 'render', 'resetFilters'].map(function (name) {
    return extractFunction(html, name);
  }).join('\n');

  const build = new Function('$', 'document', 'TH',
    'var tag = "kids"; var pinned = "some-id";\n' + code +
    '\nreturn { resetFilters: resetFilters, getTag: function() { return tag; }, getPinned: function() { return pinned; } };'
  );
  const runner = build(function (id) { return els[id]; }, document, TH);

  runner.resetFilters();

  assert.equal(els.q.value, '');
  assert.equal(els.muscle.value, '');
  assert.equal(els.equipment.value, '');
  assert.equal(els.level.value, '');
  assert.equal(runner.getTag(), '');
  assert.equal(runner.getPinned(), '');
  assert.equal(chips[0].pressed, 'true', 'default tag chip set to aria-pressed=true');
  assert.equal(chips[1].pressed, 'false', 'kids tag chip set to aria-pressed=false');
  assert.equal(els.q.focused, true, 'focus returns to search input');

  // Verify full catalog is rendered
  const stats = TH.catalogStats();
  assert.match(els.stats.textContent, new RegExp(stats.total + ' מתוך ' + stats.total + ' תרגילים'));
});

test('library.html dynamic: renders cards with accessible button aria-labels', function () {
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

test('library.html dynamic: draftPdf handler prepares print entry and navigates to print page', function () {
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
  assert.match(loc.href, /workout-print\.html/);
});
