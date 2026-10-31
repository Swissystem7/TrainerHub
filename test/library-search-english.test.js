'use strict';

// The library search box (TH.filterCatalog({ q })): coaches type «push up»,
// «פוש אפ», «mountain climbers» or «פלנק», the names the editor already
// understands through THInfer.normalizeSynonym, but library.html never loaded
// js/infer.js, so each search found 0 clips.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

require('../js/infer.js');
const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function names(q) {
  return TH.filterCatalog({ q: q }).map(function (e) { return e.he; }).sort();
}

test('«push up» and «פוש אפ» list the push-up clips', function () {
  const all = names('שכיבות שמיכה');
  assert.ok(all.length > 0);
  ['push up', 'push-ups', 'pushup', 'פוש אפ'].forEach(function (q) {
    assert.deepEqual(names(q), all, q);
  });
});

test('«mountain climbers» and «פלנק» find the Hebrew-named clips', function () {
  assert.ok(names('מטפס הרים').length > 0);
  assert.deepEqual(names('mountain climbers'), names('מטפס הרים'));
  assert.deepEqual(names('מאונטיין קליימר'), names('מטפס הרים'));
  assert.ok(names('פלאנק').length > 0);
  assert.deepEqual(names('פלנק'), names('פלאנק'));
});

test('library.html loads js/infer.js so the page search has the synonyms', function () {
  const html = fs.readFileSync(path.join(__dirname, '..', 'library.html'), 'utf8');
  assert.ok(html.indexOf('<script src="./js/infer.js"></script>') !== -1);
});
