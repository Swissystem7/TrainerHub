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

const SQUAT = ['סקוואט', 3, 12, null];

test('hour words on a cardio line are the work time, not part of the name', () => {
  // Was a clip-less exercise «ריצה חצי שעה» / «ריצה שעה» with 10 invented reps.
  assert.deepStrictEqual(rows('ריצה חצי שעה'), [['ריצה', 1, null, 1800]]);
  assert.deepStrictEqual(rows('ריצה שעה'), [['ריצה', 1, null, 3600]]);
  assert.deepStrictEqual(rows('ריצה שעה אחת'), [['ריצה', 1, null, 3600]]);
  assert.deepStrictEqual(rows('הליכה מהירה חצי שעה'), [['הליכה מהירה', 1, null, 1800]]);
  assert.deepStrictEqual(rows('ריצה קלה רבע שעה'), [['ריצה קלה', 1, null, 900]]);
  assert.deepStrictEqual(rows('ריצה שלושת רבעי שעה'), [['ריצה', 1, null, 2700]]);
  assert.deepStrictEqual(rows('רכיבה על אופניים שעה וחצי'), [['רכיבה על אופניים', 1, null, 5400]]);
  assert.deepStrictEqual(rows('ריצה שעה ורבע'), [['ריצה', 1, null, 4500]]);
  assert.deepStrictEqual(rows('רכיבה שעתיים'), [['רכיבה', 1, null, 7200]]);
  assert.deepStrictEqual(rows('רכיבה שעתיים וחצי'), [['רכיבה', 1, null, 9000]]);
  assert.deepStrictEqual(rows('שעה ריצה'), [['ריצה', 1, null, 3600]]);
  // The paste keeps its other lines and the cue stays a note.
  assert.deepStrictEqual(rows('ריצה חצי שעה\nסקוואט 3x12\nפלאנק 30 שניות'), [['ריצה', 1, null, 1800], SQUAT, ['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('חימום: הליכה רבע שעה'), [['הליכה', 1, null, 900]]);
  assert.deepStrictEqual(rows('ריצה חצי שעה, הליכה רבע שעה'), [['ריצה', 1, null, 1800], ['הליכה', 1, null, 900]]);
  assert.deepStrictEqual(rows('ריצה חצי שעה דופק 150'), [['ריצה', 1, null, 1800]]);
  assert.deepStrictEqual(note('ריצה חצי שעה דופק 150'), ['דופק 150']);
  assert.deepStrictEqual(rows('ריצה חצי שעה x2'), [['ריצה', 2, null, 1800]]);
});

test('digit hours, fraction hours and hours plus minutes', () => {
  // «ריצה 1.5 שעות» was a name «ריצה 1 5 שעות», «ריצה 3/4 שעה» 3 sets of 4, «ריצה שעה ו-20 דקות» 20 minutes.
  assert.deepStrictEqual(rows('ריצה 1.5 שעות'), [['ריצה', 1, null, 5400]]);
  assert.deepStrictEqual(rows('ריצה 1,5 שעות'), [['ריצה', 1, null, 5400]]);
  assert.deepStrictEqual(rows('הליכה 2 שעות'), [['הליכה', 1, null, 7200]]);
  assert.deepStrictEqual(rows('שחייה 1 שעה'), [['שחייה', 1, null, 3600]]);
  assert.deepStrictEqual(rows('ריצה 1:30 שעות'), [['ריצה', 1, null, 5400]]);
  assert.deepStrictEqual(rows('ג׳וגינג 1/2 שעה'), [['ג׳וגינג', 1, null, 1800]]);
  assert.deepStrictEqual(rows('ריצה ½ שעה'), [['ריצה', 1, null, 1800]]);
  assert.deepStrictEqual(rows('ריצה 3/4 שעה'), [['ריצה', 1, null, 2700]]);
  assert.deepStrictEqual(rows('ריצה שעה ו-20 דקות'), [['ריצה', 1, null, 4800]]);
  assert.deepStrictEqual(rows('ריצה שעה ו20 דקות'), [['ריצה', 1, null, 4800]]);
  assert.deepStrictEqual(rows('ריצה שעה 20 דקות'), [['ריצה', 1, null, 4800]]);
});

test('an hour of rest is a rest, a title with an hour stays a title, a clock time stays a clock time', () => {
  // «מנוחה חצי שעה» was a phantom exercise «חצי שעה» with 10 reps.
  const rest = all('סקוואט 3x12\nמנוחה חצי שעה');
  assert.deepStrictEqual(rest.map(function (ex) { return [ex.name, ex.rest_seconds]; }), [['סקוואט', 1800]]);
  // The digit-free title of the paste dropped before and drops now (not a 60-minute «אימון רגליים»).
  assert.deepStrictEqual(rows('אימון רגליים - שעה\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון של שעה\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('תוכנית אימון של שעה\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('**אימון בוקר - שעה וחצי**\nסקוואט 3x12'), [SQUAT]);
  // Clock times and relations are untouched (as on master).
  assert.deepStrictEqual(rows('סקוואט 3x12 בשעה 18:00'), [['סקוואט בשעה', 3, 12, 1080]]);
  assert.deepStrictEqual(rows('שעה 18:00 סקוואט 3x12'), [['שעה סקוואט', 3, 12, 1080]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 לפחות שעה אחרי אוכל'), [['סקוואט לפחות שעה אחרי אוכל', 3, 12, null]]);
  assert.deepStrictEqual(rows('לשתות מים 24 שעות לפני\nסקוואט 3x12'), [['לשתות מים 24 שעות לפני', 1, 10, null], SQUAT]);
  assert.deepStrictEqual(rows('שעתיים לפני האימון לא לאכול\nסקוואט 3x12'), [['שעתיים לפני האימון לא לאכול', 1, 10, null], SQUAT]);
  assert.deepStrictEqual(rows('כל שעה הפסקה\nסקוואט 3x12'), [['כל שעה', 1, 10, null], SQUAT]);
  // Minutes written as minutes are what they were.
  assert.deepStrictEqual(rows('ריצה 30 דקות'), [['ריצה', 1, null, 1800]]);
});
