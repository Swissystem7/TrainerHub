'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, (e.notes || '').replace(/ · חסר סרטון$|^חסר סרטון$/, '')]));
}

test('«סקוואט 3x12 @ 60 ק"ג» is a load note, the at sign is not part of the name', () => {
  // Was a name «סקוואט @» (the kilos were read, the sign stayed) that matches no clip.
  assert.deepStrictEqual(rows('סקוואט 3x12 @ 60 ק"ג'), [['סקוואט', 3, 12, null, '60 ק"ג']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 @80 קג'), [['לחיצת חזה', 4, 8, null, '80 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 @ 62.5 קילו'), [['סקוואט', 3, 12, null, '62.5 ק"ג']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 @100kg'), [['דדליפט', 5, 5, null, '100 ק"ג']]);
});

test('«דדליפט 5x5 @100» is 100 kilos even without the unit', () => {
  // Was a name «דדליפט @100».
  assert.deepStrictEqual(rows('דדליפט 5x5 @100'), [['דדליפט', 5, 5, null, '100 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט @60 3x12'), [['סקוואט', 3, 12, null, '60 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 @ 60 ק"ג\nדדליפט 5x5 @100'), [['סקוואט', 3, 12, null, '60 ק"ג'], ['דדליפט', 5, 5, null, '100 ק"ג']]);
  assert.deepStrictEqual(Ingest.ingestText('סקוואט 3x12 @ 60 ק"ג\nדדליפט 5x5 @100').unmatched, ['סקוואט', 'דדליפט']);
});

test('«@ 70%», «@RPE 8» and a pace «@ 5:30» are notes, the pace is not a duration', () => {
  // Were names «סקוואט @ 70%» / «דדליפט @RPE 8»; «ריצה 2 ק"מ @ 5:30» was a 330-second «ריצה @».
  assert.deepStrictEqual(rows('סקוואט 3x12 @ 70%'), [['סקוואט', 3, 12, null, '70%']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 @70 אחוז'), [['סקוואט', 3, 12, null, '70%']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 @RPE 8'), [['דדליפט', 5, 5, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 @8 RPE'), [['דדליפט', 5, 5, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('ריצה 2 ק"מ @ 5:30'), [['ריצה', 1, null, null, '2 ק"מ · קצב 5:30']]);
});

test('the at-sign load rides on its exercise as a comma piece too', () => {
  // Was a second exercise named «@60 ק"ג» with 10 invented reps.
  assert.deepStrictEqual(rows('סקוואט 3x10, @60 ק"ג'), [['סקוואט', 3, 10, null, '60 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט 3x10, @ 70%'), [['סקוואט', 3, 10, null, '70%']]);
});

test('a bare sign is dropped, a mention and the plain load are as they were', () => {
  assert.deepStrictEqual(rows('סקוואט @ 3x12'), [['סקוואט', 3, 12, null, '']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 80 קג'), [['לחיצת חזה', 4, 8, null, '80 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט 3x10 עם 20 קילו'), [['סקוואט', 3, 10, null, '20 ק"ג']]);
  // A WhatsApp mention has no number after the sign; it stays for the existing rules.
  assert.equal(rows('סקוואט 3x12 @ירון')[0][4], '');
});
