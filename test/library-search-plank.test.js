'use strict';

// The library search box (TH.filterCatalog({ q })): English «plank» found 1 of
// the 7 plank clips (only the one whose id is «plank»), «planks» and
// «side plank» found none. THInfer.normalizeSynonym now folds them to
// «פלאנק» / «פלאנק צידי», the catalog's Hebrew names.

const test = require('node:test');
const assert = require('node:assert/strict');

const Infer = require('../js/infer.js');
const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function names(q) {
  return TH.filterCatalog({ q: q }).map(function (e) { return e.he; }).sort();
}

test('«plank» and «planks» list every plank clip', function () {
  const all = names('פלאנק');
  assert.ok(all.length >= 7);
  ['plank', 'Plank', 'planks'].forEach(function (q) {
    assert.deepEqual(names(q), all, q);
  });
});

test('«side plank» finds the side-plank clip', function () {
  const side = names('פלאנק צידי');
  assert.ok(side.length > 0);
  assert.deepEqual(names('side plank'), side);
  assert.deepEqual(names('side-plank'), side);
});

test('the editor synonym folds English plank names too', function () {
  const I = Infer && Infer.normalizeSynonym ? Infer : globalThis.THInfer;
  assert.equal(I.normalizeSynonym('plank 30s'), 'פלאנק 30s');
  assert.equal(I.normalizeSynonym('Side Plank'), 'פלאנק צידי');
});
