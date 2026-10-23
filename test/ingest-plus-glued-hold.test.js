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

function first(text) {
  const ex = Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises;
  assert.equal(ex.length, 1, text);
  return ex[0];
}

test('«גשר 3x15 +החזקה 10 שניות» is «גשר» 3x15 with the whole hold as a note, not a name «גשר +החזקה»', () => {
  for (const text of ['גשר 3x15 +החזקה 10 שניות', 'גשר 3x15 &החזקה 10 שניות']) {
    const ex = first(text);
    assert.equal(ex.name, 'גשר', text);
    assert.equal(ex.sets, 3);
    assert.equal(ex.reps, 15);
    assert.match(ex.notes, /החזקה 10 שניות/);
    assert.doesNotMatch(ex.notes, /\+/);
  }
});

test('«סקוואט 3x10 +עצירה של 2 שניות למטה» keeps the hold word in the note', () => {
  const ex = first('סקוואט 3x10 +עצירה של 2 שניות למטה');
  assert.equal(ex.name, 'סקוואט');
  assert.match(ex.notes, /עצירה של 2 שניות למטה/);
});

test('«סקוואט 3x10 +2 שניות למטה» is 3x10 reps with a hold, not a 10-second «סקוואט למטה»', () => {
  const ex = first('סקוואט 3x10 +2 שניות למטה');
  assert.equal(ex.name, 'סקוואט');
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, 10);
  assert.equal(ex.duration_seconds ?? null, null);
  assert.match(ex.notes, /2 שניות למטה/);
});

test('a spaced «+ החזקה» and a «+» between two exercises are unchanged', () => {
  assert.equal(first('גשר 3x15 + החזקה 10 שניות').name, 'גשר');
  const ex = Ingest.ingestText('סקוואט 3x12 + ברפי 3x10', TH.catalog).workout.phases[1].exercises;
  assert.deepEqual(ex.map(function (e) { return e.name; }), ['סקוואט', 'ברפי']);
});
