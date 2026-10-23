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

function all(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises;
}
function rows(text) {
  return all(text).map(function (ex) { return [ex.name, ex.sets, ex.reps, ex.duration_seconds]; });
}
function note(text) {
  return all(text).map(function (ex) { return String(ex.notes || '').replace(/ · חסר סרטון$|^חסר סרטון$/, ''); });
}

const PLANK = ['פלאנק', 1, null, 30];

test('a comma inside brackets does not split the line', () => {
  // Was «סקוואט ( ירידה» 3x10 held 3 s and a second exercise «עלייה)» held 1 s.
  assert.deepStrictEqual(rows('סקוואט 3x10 (3 שניות ירידה, 1 שנייה עלייה)'), [['סקוואט', 3, 10, null]]);
  assert.deepStrictEqual(note('סקוואט 3x10 (3 שניות ירידה, 1 שנייה עלייה)'), ['3 שניות ירידה · 1 שנייה עלייה']);
  assert.deepStrictEqual(rows('סקוואט 3x10 (3 שניות ירידה; 1 שנייה עלייה)'), [['סקוואט', 3, 10, null]]);
  // The exercise after it on the next line is still its own.
  assert.deepStrictEqual(rows('סקוואט 3x10 (3 שניות ירידה, 1 שנייה עלייה)\nפלאנק 30 שניות'), [['סקוואט', 3, 10, null], PLANK]);
});

test('a digit-free bracket with a comma is one note', () => {
  // Was «לחיצת חזה (לאט» 4x8 and a phantom «בשליטה)» with 10 invented reps.
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 (לאט, בשליטה)'), [['לחיצת חזה', 4, 8, null]]);
  assert.deepStrictEqual(note('לחיצת חזה 4x8 (לאט, בשליטה)'), ['לאט, בשליטה']);
  assert.deepStrictEqual(rows('פלאנק 30 שניות (גב ישר, מבט למטה)'), [PLANK]);
  assert.deepStrictEqual(note('פלאנק 30 שניות (גב ישר, מבט למטה)'), ['גב ישר, מבט למטה']);
  assert.deepStrictEqual(note('לאנג׳ 3x10 (לכל רגל, לאט)'), ['לכל רגל, לאט']);
  assert.deepStrictEqual(note('סקוואט 3x12 (ירידה איטית ועלייה מהירה)'), ['ירידה איטית ועלייה מהירה']);
  // A second exercise after the bracket is still split off at its comma.
  assert.deepStrictEqual(rows('שכיבות סמיכה 3x10 (ברכיים), פלאנק 30 שניות (גב ישר, לאט)'), [['שכיבות סמיכה', 3, 10, null], PLANK]);
  assert.deepStrictEqual(note('שכיבות סמיכה 3x10 (ברכיים), פלאנק 30 שניות (גב ישר, לאט)'), ['ברכיים', 'גב ישר, לאט']);
});

test('a bracket with a count and a cue keeps the count and notes the cue', () => {
  // Was a name «סקוואט (» (the stray bracket rode into the name).
  assert.deepStrictEqual(rows('סקוואט (3 סטים, 12 חזרות)'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(rows('פלאנק (30 שניות, 3 סטים)'), [['פלאנק', 3, null, 30]]);
  // The load in the bracket is still the load, the cue a note.
  assert.deepStrictEqual(rows('סקוואט 3x12 (60 ק"ג, לאט)'), [['סקוואט', 3, 12, null]]);
  assert.deepStrictEqual(note('סקוואט 3x12 (60 ק"ג, לאט)'), ['לאט · 60 ק"ג']);
  // The rest in the bracket is still the rest.
  const rest = all('סקוואט 3x12 (מנוחה 30 שניות, לאט)');
  assert.deepStrictEqual(rest.map(function (ex) { return [ex.name, ex.sets, ex.reps, ex.rest_seconds]; }), [['סקוואט', 3, 12, 30]]);
  assert.deepStrictEqual(note('סקוואט 3x12 (מנוחה 30 שניות, לאט)'), ['לאט']);
});

test('lines without brackets split as before', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12, פלאנק 30 שניות'), [['סקוואט', 3, 12, null], PLANK]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (לאט), פלאנק 30 שניות'), [['סקוואט', 3, 12, null], PLANK]);
  // An unclosed bracket is no bracket: the comma still splits (the stray «(לאט» in the name is as before).
  const unclosed = rows('סקוואט 3x12 (לאט, פלאנק 30 שניות');
  assert.strictEqual(unclosed.length, 2);
  assert.deepStrictEqual(unclosed[0].slice(1), [3, 12, null]);
  assert.deepStrictEqual(unclosed[1], PLANK);
});
