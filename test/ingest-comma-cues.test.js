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
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises.map(function (ex) {
    return { name: ex.name, id: ex.id, sets: ex.sets, reps: ex.reps, duration_seconds: ex.duration_seconds, notes: ex.notes };
  });
}

test('a cue after a comma is a note on the exercise, not a second exercise', () => {
  // Was two exercises: «פלאנק» and a clip-less «ירידה איטית» with an invented 10 reps.
  assert.deepStrictEqual(all('פלאנק 30 שניות, ירידה איטית'),
    [{ name: 'פלאנק', id: 'plank', sets: 1, reps: null, duration_seconds: 30, notes: 'ירידה איטית' }]);
  assert.deepStrictEqual(all('שכיבות סמיכה 3x12, מרפקים צמודים'),
    [{ name: 'שכיבות סמיכה', id: 'אתגר_שכיבות_שמיכה', sets: 3, reps: 12, duration_seconds: null, notes: 'מרפקים צמודים' }]);
  const squat = all('סקוואט 15, לאט, גב ישר');
  assert.equal(squat.length, 1);
  assert.equal(squat[0].reps, 15);
  assert.match(squat[0].notes, /^לאט · גב ישר/);
  assert.match(all('סקוואט 15 ולאט')[0].notes, /^לאט/);
});

test('a cue after a comma-split sets count still reaches the exercise', () => {
  assert.deepStrictEqual(all('מתח 5 חזרות, 4 סטים, לאט'),
    [{ name: 'מתח', id: 'bodyweight_row', sets: 4, reps: 5, duration_seconds: null, notes: 'לאט' }]);
});

test('exercise lists and body-part clip names are not cues', () => {
  assert.deepStrictEqual(all('סקוואט, לאנג׳, פלאנק').map(function (e) { return e.name; }), ['סקוואט', 'לאנג׳', 'פלאנק']);
  const knees = all('סקוואט 15, פלאנק ברכיים 30 שניות');
  assert.deepStrictEqual(knees.map(function (e) { return e.id; }), [null, 'פלאנק_ברכיים']);
  // A cue never opens a line and never borrows from the line above.
  assert.equal(all('ירידה איטית, פלאנק').length, 2);
  assert.equal(all('פלאנק 30 שניות\nבשליטה').length, 2);
});
