'use strict';

// The library search box (TH.filterCatalog({ q })) missed clips over spelling:
// the catalog has «שכיבות סמיכה ורגליים» and «אתגר שכיבות שמיכה», so each spelling
// found only its own clips; and «פלאנק בטן» found nothing because core clips are
// labelled «ליבה», while coaches say «בטן».

const test = require('node:test');
const assert = require('node:assert/strict');

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));

function names(q) {
  return TH.filterCatalog({ q: q }).map(function (e) { return e.he; }).sort();
}

test('«שכיבות סמיכה» and «שכיבות שמיכה» find the same push-up clips', function () {
  const a = names('שכיבות סמיכה');
  assert.deepEqual(a, names('שכיבות שמיכה'));
  assert.ok(a.indexOf('אתגר שכיבות שמיכה') !== -1);
  assert.ok(a.indexOf('שכיבות סמיכה ורגליים') !== -1);
});

test('«פלאנק בטן» finds the plank clips', function () {
  const p = names('פלאנק בטן');
  assert.ok(p.indexOf('פלאנק') !== -1);
  assert.ok(p.indexOf('פלאנק צידי') !== -1);
});

test('«בטן» lists the same clips as «ליבה»', function () {
  assert.deepEqual(names('בטן'), names('ליבה'));
});
