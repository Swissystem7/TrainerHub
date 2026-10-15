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

function one(text) {
  const ex = Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises[0];
  return { name: ex.name, id: ex.id, sets: ex.sets, reps: ex.reps, duration_seconds: ex.duration_seconds, notes: ex.notes };
}

test('a cue after a spaced dash is a note: the name finds its clip and the count stays the reps', () => {
  assert.deepStrictEqual(one('שכיבות סמיכה 3x12 - מרפקים צמודים'),
    { name: 'שכיבות סמיכה', id: 'אתגר_שכיבות_שמיכה', sets: 3, reps: 12, duration_seconds: null, notes: 'מרפקים צמודים' });
  assert.deepStrictEqual(one('פלאנק 45 שניות – גב ישר'),
    { name: 'פלאנק', id: 'plank', sets: 1, reps: null, duration_seconds: 45, notes: 'גב ישר' });
  // Was name «סקוואט 15 ירידה איטית» with an invented 10 reps.
  const squat = one('סקוואט 15 - ירידה איטית');
  assert.equal(squat.name, 'סקוואט');
  assert.equal(squat.reps, 15);
  assert.ok(squat.notes.startsWith('ירידה איטית'));
  assert.ok(!Ingest.wishlistList().some(function (w) { return /איטית/.test(w.name); }), 'the wishlist names the exercise, not the cue');
});

test('«בכל סט» / «לסט» is filler: the count before it is the reps', () => {
  assert.deepStrictEqual(one('כפיפות בטן 20 בכל סט'),
    { name: 'כפיפות בטן', id: 'crunches', sets: 1, reps: 20, duration_seconds: null, notes: null });
  assert.equal(one('כפיפות בטן 3 סטים 15 לסט').reps, 15);
  assert.equal(one('לאנג׳ 12 - לכל רגל').reps, 12, 'the dash left behind by «לכל רגל» does not hide the count');
});

test('a dash that is not a cue stays as it was', () => {
  assert.deepStrictEqual(one('פלאנק - דקה'),
    { name: 'פלאנק', id: 'plank', sets: 1, reps: null, duration_seconds: 60, notes: null });
  assert.equal(one('כפיפות בטן - 20').reps, 20);
  assert.equal(one('כפיפות בטן - 3 סטים של 15').sets, 3);
  assert.equal(one('פשיטת-ברך 12').name, 'פשיטת ברך');
});
