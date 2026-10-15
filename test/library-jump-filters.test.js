'use strict';

// library.html: a «חלופות» button must show the alternative it names even
// when the muscle / equipment / level selects are set for the current card.
// Before the fix only the tag chip was reset, so e.g. «מעגל מעגל» (bodyweight)
// → «גומיות במקום מכון» (band) under the «משקל גוף» filter rendered an empty grid.

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

// The page's filter state as the real click handler sees it.
function pageState(initial) {
  const els = {
    q: { value: '', focused: false, focus: function () { this.focused = true; } },
    muscle: { value: initial.muscle || '' },
    equipment: { value: initial.equipment || '' },
    level: { value: initial.level || '' }
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
  const renders = [];
  const fn = extractFunction(page, 'jumpToAlternative');
  const run = new Function('$', 'document', 'render', 'name', 'tag',
    fn + '\njumpToAlternative(name);\nreturn tag;');
  return {
    els: els,
    chips: chips,
    renders: renders,
    jump: function (name) {
      return run(function (id) { return els[id]; }, document, function () {
        renders.push({ q: els.q.value, muscle: els.muscle.value, equipment: els.equipment.value, level: els.level.value });
      }, name, initial.tag || '');
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
  const tagAfter = state.jump(found.alt.he);
  assert.equal(tagAfter, '');
  assert.equal(state.els.q.value, found.alt.he);
  assert.equal(state.els.muscle.value, '');
  assert.equal(state.els.equipment.value, '');
  assert.equal(state.els.level.value, '');
  assert.equal(state.els.q.focused, true);
  assert.equal(state.renders.length, 1, 'renders once with the cleared filters');
  const filters = Object.assign({ tag: tagAfter }, state.renders[0]);
  assert.ok(
    TH.filterCatalog(filters).some(function (e) { return e.id === found.alt.id; }),
    'the grid shows «' + found.alt.he + '» after the jump'
  );
  assert.deepEqual(state.chips.map(function (c) { return c.attrs['aria-pressed']; }), ['true', 'false', 'false']);
});

test('the grid click handler routes «חלופות» buttons through jumpToAlternative', function () {
  assert.match(page, /jumpToAlternative\(jump\.textContent\.trim\(\)\);\s*return;/);
});
