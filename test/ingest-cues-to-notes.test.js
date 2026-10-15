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

test('«עד כשל» / «מקסימום חזרות» is a note: the name still finds its clip and no 10 reps are invented', () => {
  assert.deepStrictEqual(one('שכיבות סמיכה 3 סטים עד כשל'),
    { name: 'שכיבות סמיכה', id: 'אתגר_שכיבות_שמיכה', sets: 3, reps: null, duration_seconds: null, notes: 'עד כשל' });
  assert.deepStrictEqual(one('מתח מקסימום חזרות'),
    { name: 'מתח', id: 'bodyweight_row', sets: 1, reps: null, duration_seconds: null, notes: 'עד כשל' });
  assert.equal(one('שכיבות סמיכה עד כשל, 3 סטים').sets, 3);
});

test('«לכל צד/רגל» is a note, and the count before it is the reps', () => {
  assert.deepStrictEqual(one('כפיפות בטן 20 לכל צד'),
    { name: 'כפיפות בטן', id: 'crunches', sets: 1, reps: 20, duration_seconds: null, notes: 'לכל צד' });
  assert.deepStrictEqual(one('פלאנק צד 30 שניות לכל צד'),
    { name: 'פלאנק צד', id: 'פלאנק_צידי', sets: 1, reps: null, duration_seconds: 30, notes: 'לכל צד' });
  const lunge = one('לאנג׳ים 12 חזרות כל רגל');
  assert.equal(lunge.name, 'לאנג׳ים');
  assert.equal(lunge.notes, 'לכל רגל · חסר סרטון');
  assert.ok(!Ingest.wishlistList().some(function (w) { return /כל רגל/.test(w.name); }), 'the wishlist names the exercise, not the cue');
});

test('a direction «לצד» stays in the name', () => {
  const ex = one('פלאנק מצד לצד 30 שניות');
  assert.equal(ex.name, 'פלאנק מצד לצד');
  assert.equal(ex.id, 'פלאנק_מצד_לצד');
  assert.equal(ex.notes, null);
});

test('a distance is a note, not 10 reps; a parenthetical cue is a note, a parenthetical prescription is read', () => {
  const sprint = one('4x100 מטר ספרינט');
  assert.deepStrictEqual([sprint.name, sprint.sets, sprint.reps], ['ספרינט', 4, null]);
  assert.match(sprint.notes, /^100 מטר/);
  const run = one('ספרינט 20 מטר x5');
  assert.deepStrictEqual([run.name, run.sets, run.reps], ['ספרינט', 5, null]);
  assert.deepStrictEqual(one('מתח 3 סטים (אחיזה רחבה)'),
    { name: 'מתח', id: 'bodyweight_row', sets: 3, reps: 10, duration_seconds: null, notes: 'אחיזה רחבה' });
  const sq = one('סקוואט (3x10)');
  assert.deepStrictEqual([sq.name, sq.sets, sq.reps], ['סקוואט', 3, 10]);
});
