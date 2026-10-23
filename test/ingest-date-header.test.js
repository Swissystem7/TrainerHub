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
const PLANK = ['פלאנק', 1, null, 30];

test('a date on the title line is not a prescription', () => {
  // Was an exercise «אימון» of 3 sets (the date read as a rep ladder 12/10/26).
  assert.deepStrictEqual(rows('אימון 12/10/26\nסקוואט 3x12\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  // Was a clip-less «אימון 12 10 26» with 10 invented reps.
  assert.deepStrictEqual(rows('אימון 12.10.26\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('*אימון 12.10.26:*\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים 12.10.2026\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('תוכנית 12/10\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון 1 - 12/10\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון מספר 3 12.10.26\nסקוואט 3x12'), [SQUAT]);
  // The date first, the title after it.
  assert.deepStrictEqual(rows('12.10.26 אימון פלג גוף עליון\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('12.10 אימון רגליים\nסקוואט 3x12'), [SQUAT]);
});

test('a date line, a «תאריך» line and a weekday with a date are dropped', () => {
  // Was a phantom «12/10/2026» / «תאריך 12/10/2026» / «יום שני 12 10» with 10 invented reps.
  assert.deepStrictEqual(rows('12/10/2026\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('תאריך: 12/10/2026\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('תאריך 12.10.26\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני 12.10\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון יום שני 12.10\nסקוואט 3x12'), [SQUAT]);
  // The weekday with a date is a label over the exercise after the colon.
  assert.deepStrictEqual(rows('יום שני 12.10: סקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים 12.10.26: סקוואט 3x12, פלאנק 30 שניות'), [SQUAT, PLANK]);
});

test('a dated title that names a clip is still that clip', () => {
  assert.deepStrictEqual(all('אימון קונוסים 12.10\nסופרמן 10').map((ex) => ex.id), ['אימון_קונוסים_תגובה_וכוח', 'superman']);
});

test('a ladder, a Tabata pair, a decimal and a count-first line are not dates', () => {
  assert.deepStrictEqual(rows('לחיצת חזה 12/10/8'), [['לחיצת חזה', 3, 12, null]]);
  assert.deepStrictEqual(note('לחיצת חזה 12/10/8'), ['12/10/8']);
  assert.deepStrictEqual(all('טבאטה 8 סבבים 20/10:\nסקוואט קפיצה').map((ex) => [ex.sets, ex.duration_seconds, ex.rest_seconds]), [[8, 20, 10]]);
  assert.deepStrictEqual(note('ריצה 1.5 ק"מ'), ['1.5 ק"מ']);
  assert.deepStrictEqual(rows('10 ברפי'), [['ברפי', 1, 10, null]]);
  assert.deepStrictEqual(rows('סקוואט 12/10'), [['סקוואט', 1, 12, null]]);
  assert.deepStrictEqual(note('סקוואט 12/10'), ['12/10']);
  assert.deepStrictEqual(rows('לחיצת חזה 10.5 ק"ג 3x8'), [['לחיצת חזה', 3, 8, null]]);
  // A day out of range is not a date, so the line is read as before.
  assert.strictEqual(rows('אימון 40/10/26\nסקוואט 3x12').length, 2);
  // A title with minutes keeps its minutes.
  assert.deepStrictEqual(rows('אימון 12 דקות\nסקוואט 3x12').map((r) => r[3]), [720, null]);
});
