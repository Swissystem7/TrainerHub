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
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds, (e.notes || '').replace(/\s*·\s*חסר סרטון$|^חסר סרטון$/, '') || null]));
}

test('«פלאנק 3x30: גב ישר» is 3×30 with the cue as a note, not a name «פלאנק 3 30 גב ישר»', () => {
  // The colon after the reps blocked the «3x30» pair (its lookahead guards a clock «3x1:30»),
  // so the line was a clip-less name with one set of 10 invented reps.
  assert.deepStrictEqual(rows('פלאנק 3x30: גב ישר'), [['פלאנק', 3, 30, null, null, 'גב ישר']]);
  assert.deepStrictEqual(rows('סקוואט 3x12: לרדת עמוק'), [['סקוואט', 3, 12, null, null, 'לרדת עמוק']]);
  assert.deepStrictEqual(rows('סקוואט 3x12 : לאט'), [['סקוואט', 3, 12, null, null, 'לאט']]);
  assert.deepStrictEqual(rows('ברפי 10: לאט'), [['ברפי', 1, 10, null, null, 'לאט']]);
  // With a unit the pair parsed, but the cue rode into the name («פלאנק גב ישר»).
  assert.deepStrictEqual(rows('פלאנק 3x30 שניות: גב ישר'), [['פלאנק', 3, null, 30, null, 'גב ישר']]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות: גב ישר'), [['פלאנק', 1, null, 30, null, 'גב ישר']]);
  assert.deepStrictEqual(rows('שכיבות סמיכה 3 סטים 12: מרפקים צמודים'), [['שכיבות סמיכה', 3, 12, null, null, 'מרפקים צמודים']]);
});

test('the colon cue joins the other notes and a trailing colon or a counted tail still parse the pair', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12: לרדת עמוק, בשליטה'), [['סקוואט', 3, 12, null, null, 'לרדת עמוק · בשליטה']]);
  assert.deepStrictEqual(rows('פלאנק 3x30: גב ישר (לאט)'), [['פלאנק', 3, 30, null, null, 'גב ישר · לאט']]);
  assert.deepStrictEqual(rows('סקוואט 3x12: עד כשל'), [['סקוואט', 3, 12, null, null, 'עד כשל']]);
  assert.deepStrictEqual(rows('לאנג׳ 3x10: לכל רגל'), [['לאנג׳', 3, 10, null, null, 'לכל רגל']]);
  // «3x30:» with nothing after it, or with a rest / a load after the colon (was «פלאנק 3 30», 1×10).
  assert.deepStrictEqual(rows('פלאנק 3x30:'), [['פלאנק', 3, 30, null, null, null]]);
  assert.deepStrictEqual(rows('פלאנק 3x30: 20 שניות מנוחה'), [['פלאנק', 3, 30, null, 20, null]]);
  assert.deepStrictEqual(rows('סקוואט 4x12: 60 ק"ג'), [['סקוואט', 4, 12, null, null, '60 ק"ג']]);
  assert.deepStrictEqual(rows('1. סקוואט 3x12: עמוק\n2. פלאנק 3x30 שניות: גב ישר'), [
    ['סקוואט', 3, 12, null, null, 'עמוק'],
    ['פלאנק', 3, null, 30, null, 'גב ישר']
  ]);
});

test('a clock, a label and a title colon are untouched', () => {
  assert.deepStrictEqual(rows('פלאנק 3x1:30'), [['פלאנק', 3, null, 90, null, null]]);
  assert.deepStrictEqual(rows('סקוואט 12\nמנוחה 1:30'), [['סקוואט', 1, 12, null, 90, null]]);
  assert.deepStrictEqual(rows('סבב 1: סקוואט 12'), [['סקוואט', 1, 12, null, null, null]]);
  assert.deepStrictEqual(rows('תרגיל 3: פלאנק 30 שניות'), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('3 סבבים: סקוואט 12'), [['סקוואט', 3, 12, null, null, null]]);
  assert.deepStrictEqual(rows('פלאנק: 30 שניות'), [['פלאנק', 1, null, 30, null, null]]);
  assert.deepStrictEqual(rows('אימון רגליים: סקוואט 15'), [['סקוואט', 1, 15, null, null, null]]);
  assert.deepStrictEqual(rows('טבאטה 20/10: סקוואט'), [['סקוואט', 1, null, 20, 10, null]]);
  assert.deepStrictEqual(rows('דדליפט 3 סטים: 8/6/4'), [['דדליפט', 3, 8, null, null, '8/6/4']]);
});
