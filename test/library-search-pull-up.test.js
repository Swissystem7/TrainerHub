'use strict';

// The library search box (TH.filterCatalog({ q })): «pull up», «pull-ups»,
// «chin up», «עליות מתח», «australian pull up» and «inverted row» found 0
// clips. The bar clip is «מתח אוסטרלי»; searchFold folds them to «מתח».

const test = require('node:test');
const assert = require('node:assert/strict');

const Infer = require('../js/infer.js');
const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function names(q) {
  return TH.filterCatalog({ q: q }).map(function (e) { return e.he; }).sort();
}

test('English and Hebrew pull-up names find the bar clips', function () {
  const bar = names('מתח');
  assert.ok(bar.length > 0);
  ['pull up', 'Pull-ups', 'pullups', 'chin up', 'עליות מתח', 'australian pull up', 'inverted row'].forEach(function (q) {
    assert.deepEqual(names(q), bar, q);
  });
});

test('the editor synonym does not turn «pull up» into «מתח»', function () {
  const I = Infer && Infer.normalizeSynonym ? Infer : globalThis.THInfer;
  assert.equal(I.normalizeSynonym('pull up'), 'pull up');
});
