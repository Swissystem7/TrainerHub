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

function workout(text) {
  return Ingest.ingestText(text, TH.catalog).workout;
}
function all(text) {
  return workout(text).phases[1].exercises;
}
function rows(text) {
  return all(text).map(function (ex) { return [ex.name, ex.sets, ex.reps, ex.duration_seconds]; });
}
function ids(text) {
  return all(text).map(function (ex) { return ex.id || null; });
}
function minutes(text) {
  return workout(text).duration_minutes;
}

const SQUAT = ['סקוואט', 3, 12, null];
const PLANK = ['פלאנק', 1, null, 30];

test('a title line with the workout length is not a 45-minute exercise', () => {
  // Was an exercise «אימון» of 2700 seconds matched to the clip «אימון קונוסים -תגובה וכוח».
  assert.deepStrictEqual(rows('אימון 45 דקות\nסקוואט 3x12\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(ids('אימון 45 דקות\nסקוואט 3x12'), [null]);
  assert.strictEqual(minutes('אימון 45 דקות\nסקוואט 3x12\nפלאנק 30 שניות'), 45);
  // Was a clip-less exercise «אימון של» / «אימון ל» / «אימון רגליים» of 3600 seconds.
  assert.deepStrictEqual(rows('אימון של 60 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון ל-45 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים - 60 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים 45 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('**אימון רגליים 45 דקות**\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון כוח (45 דקות)\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון בית - 30 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון בוקר 20 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון HIIT 20 דקות\nברפי 10'), [['ברפי', 1, 10, null]]);
  assert.deepStrictEqual(rows('אימון 45 דק׳\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows("אימון 45 דק'\nסקוואט 3x12"), [SQUAT]);
  assert.deepStrictEqual(rows('תוכנית 30 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('תכנית אימון 30 דקות\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('שיעור 45 דקות\nסקוואט 3x12'), [SQUAT]);
  // With a colon after the length, on its own line or with the first exercise after it.
  assert.deepStrictEqual(rows('אימון 45 דקות:\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים 45 דקות:\nסקוואט 3x12\nפלאנק 30 שניות'), [SQUAT, PLANK]);
  assert.deepStrictEqual(rows('אימון 45 דקות - סקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון 45 דקות: סקוואט 3x12, פלאנק 30 שניות'), [SQUAT, PLANK]);
  // A digit-free tail is part of the title; a rounds count after it still sets the sets.
  assert.deepStrictEqual(rows('אימון 45 דקות בבית\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון 45 דקות 3 סבבים\nסקוואט 12\nפלאנק 30 שניות'), [SQUAT, ['פלאנק', 3, null, 30]]);
  // The title does not name the line under it, and the warm-up after it is still the warm-up.
  assert.deepStrictEqual(rows('אימון 45 דקות\nחימום 5 דקות\nסקוואט 3x12'), [['חימום', 1, null, 300], SQUAT]);
  // A paste that is only the title has no exercise.
  assert.deepStrictEqual(rows('אימון 45 דקות'), []);
});

test('the title minutes are the workout length unless a total line states one', () => {
  assert.strictEqual(minutes('אימון של 60 דקות\nסקוואט 3x12'), 60);
  assert.strictEqual(minutes('אימון רגליים - 60 דקות\nסקוואט 3x12'), 60);
  assert.strictEqual(minutes('אימון כוח (45 דקות)\nסקוואט 3x12'), 45);
  assert.strictEqual(minutes('תוכנית 30 דקות\nסקוואט 3x12'), 30);
  assert.strictEqual(minutes('אימון 45 דקות - סקוואט 3x12'), 45);
  assert.strictEqual(minutes('אימון 45 דקות'), 45);
  assert.strictEqual(minutes('אימון 40 דקות\nסקוואט 3x12\nסה"כ 35 דקות'), 35);
  assert.strictEqual(minutes('אימון רגליים\nסקוואט 3x12'), null);
  assert.strictEqual(minutes('סקוואט 3x12\nריצה 20 דקות'), null);
});

test('a clip named with a title word, a timed drill, a date and a count stay as they were', () => {
  // «אימון קונוסים» is a clip, so its line is that clip for 10 minutes, not a title.
  assert.deepStrictEqual(rows('אימון קונוסים 10 דקות\nסקוואט 3x12'), [['אימון קונוסים', 1, null, 600], SQUAT]);
  assert.deepStrictEqual(ids('אימון קונוסים 10 דקות\nסקוואט 3x12'), ['אימון_קונוסים_תגובה_וכוח', null]);
  assert.strictEqual(all('אימון קונוסים תגובה וכוח 10 דקות').length, 2);
  assert.deepStrictEqual(rows('סקוואט 3x12\nאימון בטן 10 דקות\nפלאנק 30 שניות'), [SQUAT, ['אימון בטן', 1, null, 600], PLANK]);
  assert.deepStrictEqual(rows('תרגילי בטן 10 דקות\nפלאנק 30 שניות'), [['תרגילי בטן', 1, null, 600], PLANK]);
  // Timed lines that are not titles.
  assert.deepStrictEqual(rows('ריצה 45 דקות\nסקוואט 3x12'), [['ריצה', 1, null, 2700], SQUAT]);
  assert.deepStrictEqual(rows('חימום 5 דקות\nסקוואט 3x12'), [['חימום', 1, null, 300], SQUAT]);
  assert.deepStrictEqual(rows('מתיחות 10 דקות'), [['מתיחות', 1, null, 600]]);
  assert.deepStrictEqual(rows('EMOM 10 דקות\nברפי 5'), [['ברפי', 1, 5, null]]);
  // A date, a digit-free title, an hour title and a count on the title line are read as before.
  assert.deepStrictEqual(rows('אימון 12.10.26\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון רגליים - שעה\nסקוואט 3x12'), [SQUAT]);
  assert.deepStrictEqual(rows('אימון 45 חזרות\nסקוואט 3x12').length, 2);
  assert.deepStrictEqual(rows('סקוואט 3x12\nסה"כ 45 דקות'), [SQUAT]);
});
