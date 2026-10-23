'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));
const Ingest = require('../js/ingest.js');

function exercises(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises;
}

test('«3 סטים: סקוואט 12, שכיבות סמיכה 10» gives every exercise 3 sets, not only the first', () => {
  for (const text of ['3 סטים: סקוואט 12, שכיבות סמיכה 10', '3 סטים של: סקוואט 12, שכיבות סמיכה 10', '3 סדרות: סקוואט 12, שכיבות סמיכה 10']) {
    const ex = exercises(text);
    assert.equal(ex.length, 2, text);
    assert.deepEqual(ex.map(e => [e.name, e.sets, e.reps]), [['סקוואט', 3, 12], ['שכיבות סמיכה', 3, 10]], text);
  }
});

test('an exercise\'s own sets still win over the header, as on separate lines', () => {
  const ex = exercises('4 סטים: סקוואט 3x12, שכיבות סמיכה 10');
  assert.deepEqual(ex.map(e => [e.name, e.sets, e.reps]), [['סקוואט', 3, 12], ['שכיבות סמיכה', 4, 10]]);
});

test('«פלאנק 3 סטים: 30 שניות» is untouched (the sets follow a name)', () => {
  const ex = exercises('פלאנק 3 סטים: 30 שניות');
  assert.equal(ex.length, 1);
  assert.equal(ex[0].name, 'פלאנק');
  assert.equal(ex[0].sets, 3);
});
