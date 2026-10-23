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
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]));
}

const TWO = [['סקוואט', 3, 12, null], ['מתח', 3, 8, null]];

test('a total line «סה"כ 25 דקות» is the workout length, not a 1500-second exercise', () => {
  // Was an exercise «סה"כ» with duration_seconds 1500 (and a wishlist entry for its clip).
  const r = Ingest.ingestText('סקוואט 3x12\nמתח 3x8\nסה"כ 25 דקות');
  assert.deepStrictEqual(r.workout.phases.flatMap((p) => p.exercises.map((e) => e.name)), ['סקוואט', 'מתח']);
  assert.equal(r.workout.duration_minutes, 25);
  assert.deepStrictEqual(r.unmatched, ['סקוואט', 'מתח']);
  assert.ok(!r.wishlist.some((w) => /סה["״]כ/.test(w.he || w.name || '')));
});

test('the total is read in its other spellings and places', () => {
  assert.equal(Ingest.ingestText('סקוואט 3x12\nמתח 3x8\nסה״כ זמן: 25 דקות').workout.duration_minutes, 25);
  assert.equal(Ingest.ingestText('סקוואט 3x12\nמתח 3x8\nזמן כולל 30 דקות').workout.duration_minutes, 30);
  assert.equal(Ingest.ingestText('סקוואט 3x12\nמתח 3x8\nמשך האימון: 40 דק׳').workout.duration_minutes, 40);
  assert.equal(Ingest.ingestText('סה"כ: 45 דקות\nסקוואט 3x12\nמתח 3x8').workout.duration_minutes, 45);
  assert.deepStrictEqual(rows('סה"כ: 45 דקות\nסקוואט 3x12\nמתח 3x8'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nזמן כולל 30 דקות'), TWO);
  // A total of rounds is dropped too (the rounds themselves are read by scanDefaults).
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nסה"כ 3 סבבים'), TWO);
  // No total: duration_minutes stays unknown and «סקוואט 25 דקות» is still a timed exercise.
  assert.equal(Ingest.ingestText('סקוואט 3x12\nמתח 3x8').workout.duration_minutes, null);
  assert.deepStrictEqual(rows('סקוואט 25 דקות'), [['סקוואט', 1, null, 1500]]);
});

test('sign-off lines «בהצלחה!», «כל הכבוד, מחר ממשיכים», «תהנו» are not exercises', () => {
  // Each was an exercise of 10 invented reps («בהצלחה!» kept its mark in the name).
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nבהצלחה!'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nשיהיה בהצלחה'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nכל הכבוד, מחר ממשיכים'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nתהנו'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nנתראה מחר'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nלשתות מים!'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nתודה לכולם 🙏'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nשבת שלום'), TWO);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמתח 3x8\nזהו.'), TWO);
  assert.deepStrictEqual(Ingest.ingestText('סקוואט 3x12\nמתח 3x8\nבהצלחה!').unmatched, ['סקוואט', 'מתח']);
});

test('a sign-off with a number or a cue line stays as it was', () => {
  // «יאללה 10 ברפי» is an exercise; «מתיחות בסוף» is left to the existing rules.
  const r = rows('סקוואט 3x12\nיאללה 10 ברפי');
  assert.equal(r.length, 2);
  assert.match(r[1][0], /ברפי/);
  assert.equal(r[1][2], 10);
  assert.deepStrictEqual(rows('סקוואט 3x12 - טמפו איטי\nמתח 3x8 - אחיזה רחבה').map((r) => r[0]), ['סקוואט', 'מתח']);
});
