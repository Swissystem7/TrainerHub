'use strict';

// The library search box (library.html → TH.filterCatalog({ q })) matched the
// whole typed text as one piece, so the words had to sit side by side in the
// clip's text: «מתח גב» found nothing although «מתח אוסטרלי» is a back clip,
// and «ילדים קונוסים» missed «ילדים חישוק קונוסים».

const test = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function names(q) {
  return TH.filterCatalog({ q: q }).map(function (e) { return e.he; });
}

test('«מתח גב» finds the back pull-up clip', function () {
  assert.ok(names('מתח גב').indexOf('מתח אוסטרלי') !== -1);
});

test('«ילדים קונוסים» finds kids cone clips with a word in between', function () {
  assert.ok(names('ילדים קונוסים').indexOf('ילדים חישוק קונוסים') !== -1);
  assert.ok(names('ילדים קונוסים').indexOf('ילדים משחק עם קונוסים') !== -1);
});

test('word order does not matter', function () {
  assert.deepEqual(names('קונוסים ילדים').sort(), names('ילדים קונוסים').sort());
  assert.deepEqual(names('כדור טניס').sort(), names('טניס כדור').sort());
});

test('every word must match', function () {
  assert.deepEqual(names('מתח קונוסים'), []);
  assert.equal(names('  גומיות  ').length, names('גומיות').length);
});
