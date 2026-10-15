'use strict';

// library.html: a «חלופות» button must show the alternative it names even
// when the muscle / equipment / level selects are set for the current card.
// Before the fix only the tag chip was reset, so e.g. «מעגל מעגל» (bodyweight)
// → «גומיות במקום מכון» (band) under the «משקל גוף» filter rendered an empty grid.
//
// It must also show that one exercise and not every card whose name or
// primary muscle contains the same word: the jump used to search by the
// button's text, so «בטן» listed 14 cards (every core clip matches the muscle
// label) and two clips sharing a Hebrew name (crunches / crunches_2) were not
// told apart. Now the grid is pinned to the button's data-jump id until the
// next keystroke or filter change.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/library.html',
  pathname: '/TrainerHub/library.html',
  hash: ''
};

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
const TH = require('../js/core.js');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

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

// The page's filter state and grid as the real handlers see them: the real
// currentFilters / render / onFilter / jumpToAlternative run with a stub $.
function pageState(initial) {
  const els = {
    q: element({ focused: false, focus: function () { this.focused = true; } }),
    muscle: element({ value: initial.muscle || '' }),
    equipment: element({ value: initial.equipment || '' }),
    level: element({ value: initial.level || '' }),
    stats: element(),
    grid: element()
  };
  const chips = ['', 'kids', 'partner'].map(function (t) {
    const attrs = { 'data-tag': t, 'aria-pressed': t === (initial.tag || '') ? 'true' : 'false' };
    return {
      getAttribute: function (k) { return attrs[k]; },
      setAttribute: function (k, v) { attrs[k] = v; },
      attrs: attrs
    };
  });
  const document = { querySelectorAll: function () { return chips; } };
  const code = ['currentFilters', 'render', 'onFilter', 'jumpToAlternative']
    .map(function (name) { return extractFunction(page, name); }).join('\n');
  const build = new Function('$', 'document', 'TH', 'initialTag',
    'var tag = initialTag;\nvar pinned = \'\';\n' + code +
    '\nreturn { jump: jumpToAlternative, filter: onFilter, render: render,' +
    ' state: function () { return { tag: tag, pinned: pinned }; } };');
  const api = build(function (id) { return els[id]; }, document, TH, initial.tag || '');
  return {
    els: els,
    chips: chips,
    api: api,
    jump: function (id, name) { api.jump(id, name); return api.state().tag; },
    cardIds: function () {
      const ids = [];
      const rx = /<article class="card" data-id="([^"]+)"/g;
      let m;
      while ((m = rx.exec(els.grid.innerHTML))) ids.push(m[1]);
      return ids;
    }
  };
}

function firstHiddenAlternative() {
  const list = TH.catalogList();
  for (let i = 0; i < list.length; i++) {
    const card = list[i];
    const alts = TH.substitutesFor({ id: card.id }, { limit: 3 });
    for (let j = 0; j < alts.length; j++) {
      const eqs = card.equipment || [];
      for (let k = 0; k < eqs.length; k++) {
        const hit = TH.filterCatalog({ q: alts[j].he, equipment: eqs[k] }).some(function (e) { return e.id === alts[j].id; });
        if (!hit) return { card: card, alt: alts[j], equipment: eqs[k] };
      }
    }
  }
  return null;
}

// The alternative whose name search lists the most cards (the «בטן» case).
function mostAmbiguousAlternative() {
  let best = null;
  TH.catalogList().forEach(function (card) {
    TH.substitutesFor({ id: card.id }, { limit: 3 }).forEach(function (alt) {
      const shown = TH.filterCatalog({ q: alt.he });
      if (!best || shown.length > best.shown.length) best = { card: card, alt: alt, shown: shown };
    });
  });
  return best;
}

test('the real catalog has alternatives the card\'s own equipment filter hides', function () {
  const found = firstHiddenAlternative();
  assert.ok(found, 'expected at least one alternative outside the card\'s equipment');
  assert.ok(
    TH.filterCatalog({ q: found.alt.he }).some(function (e) { return e.id === found.alt.id; }),
    'the alternative is found once the equipment filter is cleared'
  );
});

test('jumping to an alternative clears muscle, equipment and level, not only the tag chip', function () {
  const found = firstHiddenAlternative();
  const state = pageState({ muscle: found.card.muscles[0], equipment: found.equipment, level: found.card.level || 'beginner', tag: 'kids' });
  const tagAfter = state.jump(found.alt.id, found.alt.he);
  assert.equal(tagAfter, '');
  assert.equal(state.els.q.value, found.alt.he);
  assert.equal(state.els.muscle.value, '');
  assert.equal(state.els.equipment.value, '');
  assert.equal(state.els.level.value, '');
  assert.equal(state.els.q.focused, true);
  assert.deepEqual(state.cardIds(), [found.alt.id], 'the grid shows «' + found.alt.he + '» after the jump');
  assert.deepEqual(state.chips.map(function (c) { return c.attrs['aria-pressed']; }), ['true', 'false', 'false']);
});

test('the real catalog has an alternative whose name search lists many cards', function () {
  const found = mostAmbiguousAlternative();
  assert.ok(found.shown.length >= 5, '«' + found.alt.he + '» matches ' + found.shown.length + ' cards by name');
});

test('jumping to an ambiguous alternative shows that one card, not every card matching its name', function () {
  const found = mostAmbiguousAlternative();
  const state = pageState({});
  state.jump(found.alt.id, found.alt.he);
  assert.deepEqual(state.cardIds(), [found.alt.id]);
  assert.equal(state.api.state().pinned, found.alt.id);
  assert.match(state.els.stats.innerHTML, /^1 מתוך \d+ תרגילים · חלופה שנבחרה/);
  assert.match(state.els.stats.innerHTML, /data-unpin/);
});

test('a clip whose alternative shares its Hebrew name opens the alternative, not itself', function () {
  const list = TH.catalogList();
  let pair = null;
  list.forEach(function (card) {
    TH.substitutesFor({ id: card.id }, { limit: 3 }).forEach(function (alt) {
      if (!pair && alt.he === card.he && alt.id !== card.id) pair = { card: card, alt: alt };
    });
  });
  if (!pair) return; // the catalog no longer has a same-named pair; nothing to tell apart
  const state = pageState({});
  state.jump(pair.alt.id, pair.alt.he);
  assert.deepEqual(state.cardIds(), [pair.alt.id]);
});

test('typing in the search box or changing a filter releases the pin into a normal search', function () {
  const found = mostAmbiguousAlternative();
  const state = pageState({});
  state.jump(found.alt.id, found.alt.he);
  assert.deepEqual(state.cardIds(), [found.alt.id]);
  state.api.filter();
  assert.equal(state.api.state().pinned, '');
  assert.deepEqual(state.cardIds(), found.shown.map(function (e) { return e.id; }),
    'after the pin is released the grid is the plain name search again');
  assert.doesNotMatch(state.els.stats.innerHTML, /data-unpin/);
});

test('the grid click handler jumps by the button\'s data-jump id and shows its name in the search box', function () {
  assert.match(page, /jumpToAlternative\(jump\.getAttribute\('data-jump'\), jump\.textContent\.trim\(\)\);\s*return;/);
  assert.match(page, /\$\('filters'\)\.addEventListener\('input', onFilter\)/);
  assert.match(page, /\$\('filters'\)\.addEventListener\('change', onFilter\)/);
});
