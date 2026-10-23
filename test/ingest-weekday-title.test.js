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

test('a weekday with the day\'s title after it is a header, not an exercise', () => {
  // Was an exercise «יום שני אימון רגליים» with 10 invented reps, first in the paste or in the middle of it.
  assert.deepStrictEqual(rows('יום שני אימון רגליים\nסקוואט 3x12\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nיום שני אימון רגליים\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('יום ב\' אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום 1 אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני אימון A\nסקוואט 3x12'), [SQUAT]);
  // The date between the day and the title is stripped first.
  assert.deepStrictEqual(rows('יום שני 12.10 אימון רגליים\nסקוואט 3x12'), [SQUAT]);
});

test('a dash, a colon, a comma or brackets between the day and its title', () => {
  // Was an exercise «יום שני» with 10 reps and the title as its note.
  assert.deepStrictEqual(rows('יום שני - אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני – אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('**יום שני - אימון רגליים**\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום ב׳ - אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני - רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני - פלג גוף עליון\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nיום שלישי - גב\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('יום שני (רגליים)\nסקוואט 3x12'), [SQUAT]);
  // Was «יום א» plus a second exercise «גב».
  assert.deepStrictEqual(rows('יום א - חזה וגב\nסקוואט 3x12'), [SQUAT]);
  // Was «יום שני» plus a second exercise «אימון רגליים».
  assert.deepStrictEqual(rows('יום שני, אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  // Was an exercise «חזה» / «רגליים» (the title after the colon read as the body).
  assert.deepStrictEqual(rows('יום ראשון: חזה\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני: רגליים\nסקוואט 3x12'), [SQUAT]);
  // Was a «יום» of 1 rep (the day number read as the count).
  assert.deepStrictEqual(rows('יום 1 - רגליים\nסקוואט 3x12'), [SQUAT]);
  // Was a «יום שני אימון» of 1 rep.
  assert.deepStrictEqual(rows('יום שני - אימון 1\nסקוואט 3x12'), [SQUAT]);
});

test('a week header, alone or before a day', () => {
  // Was a «שבוע» of 1 rep, a «שבוע 1 יום» of 2 reps.
  assert.deepStrictEqual(rows('שבוע 1 - אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('שבוע 1 יום 2\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('שבוע 1 יום 2 - רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('שבוע 1 יום 2: סקוואט 3x12'), [SQUAT]);
});

test('an exercise after the day header is kept without the day in its name', () => {
  // Was a clip-less «יום שני סקוואט» / «שבוע 1 יום 2 סקוואט» / «יום סקוואט» of 1x12.
  assert.deepStrictEqual(rows('יום שני - סקוואט 3x12\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('שבוע 1 יום 2 - סקוואט 3x12, פלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('יום 1 - 3x12 סקוואט'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני אימון רגליים: סקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(all('יום שני - חימום: 5 דקות ריצה\nסקוואט 3x12').map((ex) => [ex.id, ex.duration_seconds]), [['warmup', 300], [null, null]]);
  // A day header with a colon (a label) and a day with a count of rounds work as before.
  assert.deepStrictEqual(rows('יום שני: סקוואט 3x12\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('יום א: סקוואט 3x12\nיום ב: מתח 3x8'), [SQUAT, ['מתח', 3, 8, null]]);
  assert.deepStrictEqual(rows('יום רביעי - 3 סבבים:\nסקוואט 12\nפלאנק 30 שניות'), [SQUAT, ['פלאנק', 3, null, 30]]);
});

test('a day title ending in a colon does not name the exercise below it', () => {
  // Was «יום שני - אימון רגליים סקוואט» when the next line had no name of its own.
  assert.deepStrictEqual(rows('יום שני - אימון רגליים:\n3x12 סקוואט'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני - אימון רגליים:\nסקוואט 3x12'), [SQUAT]);
});

test('lines that only look like a day header are untouched', () => {
  assert.deepStrictEqual(rows('יום הולדת 10 ברפי\nסקוואט 3x12').length, 2);
  assert.deepStrictEqual(rows('ריצה כל יום 20 דקות'), [['ריצה כל יום', 1, null, 1200]]);
  assert.deepStrictEqual(rows('יום שני\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('יום שני:\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(note('סקוואט 3x12 (רגליים)'), ['רגליים']);
});
