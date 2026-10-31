'use strict';

// The library search box (library.html → TH.filterCatalog({ q })) suggests
// «גומיות» itself, and the «גומיות» chip lists every band clip. Typing the word
// listed only the clips with it in their name, so «עבודה עם גומייה» and
// «בישיבה אחד נגד השני» were missing from the search but not from the chip.

const test = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function ids(list) {
  return list.map(function (e) { return e.id; }).sort();
}

test('typing «גומיות» lists the same clips as the «גומיות» chip', function () {
  const chip = ids(TH.filterCatalog({ tag: 'band' }));
  assert.ok(chip.indexOf('עבודה_עם_גומייה') !== -1);
  assert.deepEqual(ids(TH.filterCatalog({ q: 'גומיות' })), chip);
});

test('«כדור טניס» finds every tennis-ball clip, not just the ones named so', function () {
  const found = ids(TH.filterCatalog({ q: 'כדור טניס' }));
  const want = ids(TH.catalogList().filter(function (e) { return (e.equipment || []).indexOf('tennis-ball') !== -1; }));
  assert.equal(want.length, 4);
  want.forEach(function (id) { assert.ok(found.indexOf(id) !== -1, id); });
});

test('a name search is not widened by the gear words', function () {
  const plank = TH.filterCatalog({ q: 'פלאנק' });
  assert.ok(plank.length > 0);
  plank.forEach(function (e) { assert.match(e.he, /פלאנק/); });
});
