'use strict';

// The library search box (TH.filterCatalog({ q })): a coach types one band,
// «גומייה» or «גומיה», but the catalog and the gear chip say «גומיות», so the
// singular found 1 of the 11 band clips («גומיה» found none).

const test = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function names(q) {
  return TH.filterCatalog({ q: q }).map(function (e) { return e.he; }).sort();
}

test('«גומייה» and «גומיה» list the same clips as «גומיות»', function () {
  const all = names('גומיות');
  assert.equal(all.length, 11);
  assert.deepEqual(names('גומייה'), all);
  assert.deepEqual(names('גומיה'), all);
});

test('«גומיות» still finds the clip named «עבודה עם גומייה»', function () {
  assert.ok(names('גומיות').indexOf('עבודה עם גומייה') !== -1);
});

test('«גומייה בטן» narrows to the band core clips', function () {
  const b = names('גומייה בטן');
  assert.ok(b.indexOf('גומיות בטן') !== -1);
  assert.ok(b.indexOf('בטן גומיות') !== -1);
  assert.ok(b.length < 11);
});
