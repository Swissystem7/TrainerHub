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

function one(text) {
  const ex = Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises;
  assert.equal(ex.length, 1, text);
  return ex[0];
}

test('«לחיצת חזה 4x8 + 60 ק"ג» is 4x8 with 60 ק"ג, not 1x4 with a side split «8+60» and 8 ק"ג', () => {
  [
    ['לחיצת חזה 4x8 + 60 ק"ג', 'לחיצת חזה', 4, 8, '60 ק"ג'],
    ['לחיצת חזה 4x8 + 60kg', 'לחיצת חזה', 4, 8, '60 ק"ג'],
    ['לחיצת חזה 4x8 +60KG', 'לחיצת חזה', 4, 8, '60 ק"ג'],
    ['לחיצת חזה 4x8+60 ק״ג', 'לחיצת חזה', 4, 8, '60 ק"ג'],
    ['סקוואט 3x10 + 40 ק"ג', 'סקוואט', 3, 10, '40 ק"ג'],
    ['דדליפט 5x5 + 80 קילו', 'דדליפט', 5, 5, '80 ק"ג'],
    ['סקוואט 3x10 + 70%', 'סקוואט', 3, 10, '70%']
  ].forEach(function (c) {
    const ex = one(c[0]);
    assert.equal(ex.name, c[1], c[0]);
    assert.equal(ex.sets, c[2], c[0]);
    assert.equal(ex.reps, c[3], c[0]);
    assert.match(ex.notes, new RegExp(c[4]), c[0]);
    assert.doesNotMatch(ex.notes, /\d\+\d/, c[0]);
  });
});

test('a count on each side and an uneven split are untouched', () => {
  const plank = one('פלאנק צד 30+30 שניות');
  assert.equal(plank.duration_seconds, 30);
  assert.match(plank.notes, /לכל צד/);
  const lunge = one('לאנג׳ 3x10+10');
  assert.equal(lunge.sets, 3);
  assert.equal(lunge.reps, 10);
  assert.match(lunge.notes, /לכל צד/);
  assert.match(one('שכיבות סמיכה 20+10').notes, /20\+10/);
});
