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

test('«דדליפט 5x5 RPE 8» is 5x5 with the effort as a note, not an exercise named «דדליפט RPE 8»', () => {
  // Was a clip-less name «דדליפט RPE 8» (the at-sign form «@RPE 8» was read, the plain one was not).
  assert.deepStrictEqual(rows('דדליפט 5x5 RPE 8'), [['דדליפט', 5, 5, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 (RPE 8)'), [['דדליפט', 5, 5, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 rpe 8'), [['דדליפט', 5, 5, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x6 8 RPE'), [['לחיצת חזה', 4, 6, null, 'RPE 8']]);
  // «8.5» was «RPE 8 5» in the name.
  assert.deepStrictEqual(rows('סקוואט 3x8 RPE 8.5'), [['סקוואט', 3, 8, null, 'RPE 8.5']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 RIR 2'), [['סקוואט', 3, 12, null, 'RIR 2']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 RPE 8 מנוחה 2 דקות').map((r) => r[0]), ['דדליפט']);
  assert.equal(rows('דדליפט 5x5 RPE 8 מנוחה 2 דקות')[0][4], 'RPE 8');
});

test('«RPE 7-8» is one effort note, not a name «דדליפט RPE 7» with a range note «7-8»', () => {
  assert.deepStrictEqual(rows('דדליפט 5x5 RPE 7-8'), [['דדליפט', 5, 5, null, 'RPE 7-8']]);
  assert.deepStrictEqual(rows('סקוואט 3x5 RPE 8 (לאט)'), [['סקוואט', 3, 5, null, 'לאט · RPE 8']]);
  assert.deepStrictEqual(rows('סקוואט 3x5 (RPE 8, לאט)'), [['סקוואט', 3, 5, null, 'לאט · RPE 8']]);
});

test('«70%», «ב-70%», «85% 1RM» and «70% מהמקסימום» are load notes, not part of the name', () => {
  // Were names «דדליפט 70%», «דדליפט ב 70%», «סקוואט 85% 1RM», «דדליפט 70% מהמקסימום».
  assert.deepStrictEqual(rows('דדליפט 5x5 70%'), [['דדליפט', 5, 5, null, '70%']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 (70%)'), [['דדליפט', 5, 5, null, '70%']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 ב-70%'), [['דדליפט', 5, 5, null, '70%']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 70 אחוז'), [['דדליפט', 5, 5, null, '70%']]);
  assert.deepStrictEqual(rows('סקוואט 3x5 85% 1RM'), [['סקוואט', 3, 5, null, '85% 1RM']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 70% מהמקסימום'), [['דדליפט', 5, 5, null, '70% מהמקסימום']]);
});

test('the effort rides on its exercise as a comma piece and across a line of exercises', () => {
  // «, RPE 8» was a second exercise named «RPE» with 8 reps.
  assert.deepStrictEqual(rows('סקוואט 3x12, RPE 8'), [['סקוואט', 3, 12, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 RPE 8, לחיצת חזה 4x8 RPE 7'), [['סקוואט', 3, 12, null, 'RPE 8'], ['לחיצת חזה', 4, 8, null, 'RPE 7']]);
  assert.deepStrictEqual(Ingest.ingestText('סקוואט 3x12 RPE 8\nדדליפט 5x5 70%').unmatched, ['סקוואט', 'דדליפט']);
});

test('the at-sign forms, a range, a ladder, a tempo and a plain load are as they were', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12 @ 70%'), [['סקוואט', 3, 12, null, '70%']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 @8 RPE'), [['דדליפט', 5, 5, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('סקוואט 10-12'), [['סקוואט', 1, 10, null, '10-12']]);
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6'), [['לחיצת חזה', 3, 10, null, '10-8-6']]);
  assert.deepStrictEqual(rows('לחיצת חזה 4x8 (טמפו 3-1-1)'), [['לחיצת חזה', 4, 8, null, 'טמפו 3-1-1']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 (60 ק"ג)'), [['סקוואט', 3, 12, null, '60 ק"ג']]);
  // A bare «RPE» with no number is not an effort.
  assert.equal(rows('סקוואט 3x12 RPE')[0][4], '');
});
