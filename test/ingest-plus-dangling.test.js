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

function rows(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises
    .map(function (ex) { return [ex.name, ex.id, ex.sets, ex.reps, ex.duration_seconds]; });
}

test('«גשר 3x15 + החזקה 10 שניות» is «גשר» with the hold as a note, not a name «גשר +»', () => {
  const ex = Ingest.ingestText('גשר 3x15 + החזקה 10 שניות', TH.catalog).workout.phases[1].exercises;
  assert.equal(ex.length, 1);
  assert.equal(ex[0].name, 'גשר');
  assert.equal(ex[0].sets, 3);
  assert.equal(ex[0].reps, 15);
  assert.match(ex[0].notes, /החזקה 10 שניות/);
  assert.equal(rows('גשר 3x15 + 10 שניות החזקה')[0][0], 'גשר');
  assert.equal(rows('גשר 3x15 + עצירה 2 שניות למעלה')[0][0], 'גשר');
  assert.equal(rows('גשר 3x15 & החזקה 10 שניות')[0][0], 'גשר');
  assert.equal(rows('גשר 3x15 + טמפו 3-1-1')[0][0], 'גשר');
  assert.equal(rows('סקוואט 3x12 + RPE 8')[0][0], 'סקוואט');
  assert.equal(rows('+ גשר 3x15')[0][0], 'גשר');
});

test('a timed exercise keeps its clip when a «+» note follows', () => {
  assert.deepEqual(rows('פלאנק 3x30 שניות + 10 שניות מנוחה'), [['פלאנק', 'plank', 3, null, 30]]);
});

test('a «+» between two words of a combo move and a «+» between two exercises are untouched', () => {
  assert.equal(rows('סקוואט + קפיצה 3x10')[0][0], 'סקוואט + קפיצה');
  assert.deepEqual(rows('סקוואט 3x12 + ברפי 3x10').map(function (r) { return r[0]; }), ['סקוואט', 'ברפי']);
});
