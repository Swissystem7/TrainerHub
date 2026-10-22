const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.notes]));
}

test('a rep ladder «10-8-6» is one set per count, the first count is the reps, the ladder a note', () => {
  // Was a name «לחיצת חזה 10 8 6» with one set of 10 invented reps.
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6'), [['לחיצת חזה', 3, 10, null, '10-8-6 · חסר סרטון']]);
  assert.deepStrictEqual(rows('סקוואט 5-5-5-5-5'), [['סקוואט', 5, 5, null, '5-5-5-5-5 · חסר סרטון']]);
  // An en dash and a trailing unit are the same ladder.
  assert.deepStrictEqual(rows('סקוואט 10–8–6'), [['סקוואט', 3, 10, null, '10-8-6 · חסר סרטון']]);
  assert.deepStrictEqual(rows('מתח 12-10-8-6 חזרות'), [['מתח', 4, 12, null, '12-10-8-6 חזרות · חסר סרטון']]);
  // Was a «2-4» range note and a name «סקוואט 2 6 8 10 8 6 4 2».
  assert.deepStrictEqual(rows('סקוואט 2-4-6-8-10-8-6-4-2'), [['סקוואט', 9, 2, null, '2-4-6-8-10-8-6-4-2 · חסר סרטון']]);
});

test('a slash ladder «8/6/4» is a ladder too, with or without the sets before it', () => {
  // Was a name «דדליפט 8/6/4» with 10 invented reps.
  assert.deepStrictEqual(rows('דדליפט 3 סטים: 8/6/4'), [['דדליפט', 3, 8, null, '8/6/4 · חסר סרטון']]);
  // Was a name «דדליפט /6/4» with 8 reps.
  assert.deepStrictEqual(rows('דדליפט 3 סטים 8/6/4'), [['דדליפט', 3, 8, null, '8/6/4 · חסר סרטון']]);
  assert.deepStrictEqual(rows('לאנג׳ 12/10/8'), [['לאנג׳', 3, 12, null, '12/10/8 · חסר סרטון']]);
});

test('the paste\'s own sets win over the ladder length; a timed ladder is time', () => {
  assert.deepStrictEqual(rows('סקוואט 4 סטים 10-8-6'), [['סקוואט', 4, 10, null, '10-8-6 · חסר סרטון']]);
  assert.deepStrictEqual(rows('סקוואט 3x10-8-6'), [['סקוואט', 3, 10, null, '10-8-6 · חסר סרטון']]);
  assert.deepStrictEqual(rows('פלאנק 30-45-60 שניות'), [['פלאנק', 3, null, 30, '30-45-60 שניות · חסר סרטון']]);
});

test('the ladder rides with the rest, a load, a cue and a «3 סבבים:» header', () => {
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6 מנוחה 90 שניות').map((r) => r.slice(0, 3)), [['לחיצת חזה', 3, 10]]);
  assert.strictEqual(Ingest.ingestText('לחיצת חזה 10-8-6 מנוחה 90 שניות').workout.phases[1].exercises[0].rest_seconds, 90);
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6 80 ק"ג'), [['לחיצת חזה', 3, 10, null, '10-8-6 · 80 ק"ג · חסר סרטון']]);
  assert.deepStrictEqual(rows('לחיצת חזה 10-8-6 - לאט'), [['לחיצת חזה', 3, 10, null, '10-8-6 · לאט · חסר סרטון']]);
  // The ladder's sets replace the header's rounds for that exercise only.
  assert.deepStrictEqual(rows('3 סבבים:\nסקוואט 10-8-6\nמתח 5').map((r) => r.slice(0, 3)), [['סקוואט', 3, 10], ['מתח', 3, 5]]);
  // A comma-split ladder is a continuation of the exercise before it.
  assert.deepStrictEqual(rows('סקוואט, 10-8-6'), [['סקוואט', 3, 10, null, '10-8-6 · חסר סרטון']]);
});

test('two counts stay a range, three with a load unit are not a ladder', () => {
  assert.deepStrictEqual(rows('סקוואט 8-12'), [['סקוואט', 1, 8, null, '8-12 · חסר סרטון']]);
  assert.deepStrictEqual(rows('סקוואט 10-12 חזרות'), [['סקוואט', 1, 10, null, '10-12 חזרות · חסר סרטון']]);
  assert.deepStrictEqual(rows('ריצה 20-30 דקות'), [['ריצה', 1, null, 1200, '20-30 דקות · חסר סרטון']]);
  assert.strictEqual(rows('משקולות 60-70-80 ק"ג')[0][1], 1);
});
