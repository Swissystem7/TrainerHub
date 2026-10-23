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

test('«ריצה 20 דקות דופק 150» is a 20-minute run with the pulse as a note, not an exercise named «ריצה דופק 150»', () => {
  // Was a clip-less name «ריצה דופק 150» / «ריצה בדופק 150»; «דופק 140-150» left «ריצה בדופק 140» with a stray range note.
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק 150'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות בדופק 150'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק: 150'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות (דופק 150)'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות בדופק 140-150'), [['ריצה', 1, null, 1200, 'דופק 140-150']]);
  assert.deepStrictEqual(rows('אופניים 30 דקות דופק 130-140'), [['אופניים', 1, null, 1800, 'דופק 130-140']]);
  assert.deepStrictEqual(rows('הליכה 30 דקות דופק עד 130'), [['הליכה', 1, null, 1800, 'דופק עד 130']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק מקסימלי 170'), [['ריצה', 1, null, 1200, 'דופק מקסימלי 170']]);
});

test('«ריצה 5 ק"מ דופק 150» is a 5 km run, not 150 reps of «ריצה דופק»', () => {
  assert.deepStrictEqual(rows('ריצה 5 ק"מ דופק 150'), [['ריצה', 1, null, null, 'דופק 150 · 5 ק"מ']]);
  assert.deepStrictEqual(rows('ריצה 5 ק"מ בדופק 150'), [['ריצה', 1, null, null, 'דופק 150 · 5 ק"מ']]);
});

test('«150 bpm», «HR 150», «דופק 70%», «70% דופק», «zone 2» and «דופק נמוך» are the same pulse note', () => {
  assert.deepStrictEqual(rows('ריצה 20 דקות 150 bpm'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות 150 דופק'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות HR 150'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק 150 פעימות'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק 70%'), [['ריצה', 1, null, 1200, 'דופק 70%']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות 70% דופק'), [['ריצה', 1, null, 1200, 'דופק 70%']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק אזור 2'), [['ריצה', 1, null, 1200, 'דופק אזור 2']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות zone 2'), [['ריצה', 1, null, 1200, 'דופק אזור 2']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק נמוך'), [['ריצה', 1, null, 1200, 'דופק נמוך']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק 150 (קל)'), [['ריצה', 1, null, 1200, 'קל · דופק 150']]);
});

test('the pulse rides on its exercise as a comma piece, on its own line, and across a paste', () => {
  // «, דופק 150» was a second exercise «דופק» of 150 reps; the lone line was that phantom too.
  assert.deepStrictEqual(rows('ריצה 20 דקות, דופק 150'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות\nדופק 150'), [['ריצה', 1, null, 1200, 'דופק 150']]);
  assert.deepStrictEqual(rows('חימום 5 דקות\nריצה 20 דקות דופק 150\nפלאנק 30 שניות'), [['חימום', 1, null, 300, ''], ['ריצה', 1, null, 1200, 'דופק 150'], ['פלאנק', 1, null, 30, '']]);
  // A line that is only a cue with a number is the note of the exercise before it (was dropped).
  assert.deepStrictEqual(rows('סקוואט 3x12\nRPE 8'), [['סקוואט', 3, 12, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nטמפו 3-1-1'), [['סקוואט', 3, 12, null, 'טמפו 3-1-1']]);
  // A digit-free line («עד כשל») is left as it was.
  assert.deepStrictEqual(rows('מתח 3x8\nעד כשל'), [['מתח', 3, 8, null, '']]);
  // A paste that is only «דופק 150» has no exercise to carry it.
  assert.deepStrictEqual(rows('דופק 150'), []);
});

test('a heart-rate workout, a distance, a bare «דופק», the effort and a ladder are as they were', () => {
  // «דופק 30 דקות» is a time, not a pulse of 30: «אימון דופק 30 דקות» is the title with the
  // workout's length (no exercise, no heart-rate note), «הליכה דופק 30 דקות» a 30-minute walk.
  assert.deepStrictEqual(rows('אימון דופק 30 דקות'), []);
  assert.deepStrictEqual(rows('הליכה דופק 30 דקות'), [['הליכה דופק', 1, null, 1800, '']]);
  assert.deepStrictEqual(rows('ריצה 20 דקות 150 מטר')[0][0], 'ריצה');
  assert.equal(rows('ריצה 20 דקות 150 מטר')[0][4].indexOf('דופק'), -1);
  assert.deepStrictEqual(rows('ריצה 20 דקות דופק'), [['ריצה דופק', 1, null, 1200, '']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 RPE 8'), [['סקוואט', 3, 12, null, 'RPE 8']]);
  assert.deepStrictEqual(rows('דדליפט 5x5 70% מהמקסימום'), [['דדליפט', 5, 5, null, '70% מהמקסימום']]);
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6'), [['לחיצת חזה', 3, 10, null, '10-8-6']]);
  assert.deepStrictEqual(rows('סקוואט 10-12'), [['סקוואט', 1, 10, null, '10-12']]);
  assert.deepStrictEqual(rows('מתח 5 חזרות, 4 סטים'), [['מתח', 4, 5, null, '']]);
});
