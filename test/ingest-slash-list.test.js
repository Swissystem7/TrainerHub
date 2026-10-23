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
const LUNGE = ['לאנג׳', 3, 10, null];

test('a slash between counted exercises separates them like a comma', () => {
  // Was one exercise «סקוואט /לאנג׳ 3 10/פלאנק 3» with the plank's clip, 3x12 and a 30-second timer.
  assert.deepStrictEqual(rows('סקוואט 3x12/לאנג׳ 3x10/פלאנק 3x30 שניות'), [SQUAT, LUNGE, ['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3x12 / לאנג׳ 3x10 / פלאנק 30 שניות'), [SQUAT, LUNGE, ['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3x12/ לאנג׳ 3x10'), [SQUAT, LUNGE]);
  assert.deepStrictEqual(rows('סקוואט 3x12 /לאנג׳ 3x10'), [SQUAT, LUNGE]);
  assert.deepStrictEqual(rows('סקוואט 12 חזרות/לאנג׳ 10 חזרות'), [['סקוואט', 1, 12, null], ['לאנג׳', 1, 10, null]]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות/גשר 15 חזרות'), [['פלאנק', 1, null, 30], ['גשר', 1, 15, null]]);
  assert.deepStrictEqual(rows('חימום: ריצה 5 דקות/קפיצה בחבל 2 דקות'), [['ריצה', 1, null, 300], ['קפיצה בחבל', 1, null, 120]]);
  // The ids follow the names: the plank no longer lends its clip to the whole line.
  assert.deepStrictEqual(all('סקוואט 3x12/לאנג׳ 3x10/פלאנק 3x30 שניות').map(function (ex) { return ex.id || null; }), [null, null, 'plank']);
});

test('a cue inside a slash list rides on its exercise', () => {
  assert.deepStrictEqual(rows('סקוואט 3x12/לאנג׳ 3x10 לכל רגל/פלאנק 30 שניות'), [SQUAT, LUNGE, ['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(note('סקוואט 3x12/לאנג׳ 3x10 לכל רגל/פלאנק 30 שניות'), ['', 'לכל רגל', '']);
});

test('a slash inside one exercise is not a separator', () => {
  // Per side, sets/time, work/rest, half a minute, a pace or a speed unit: the right side has no count of its own or opens with a digit.
  assert.deepStrictEqual(rows('שכיבות סמיכה 10/10'), [['שכיבות סמיכה', 1, 10, null]]);
  assert.deepStrictEqual(note('שכיבות סמיכה 10/10'), ['לכל צד']);
  assert.deepStrictEqual(rows('פלאנק 3/30"'), [['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('ברפי 30/15 שניות').map(function (r) { return r[3]; }), [30]);
  assert.deepStrictEqual(rows('1/2 דקה פלאנק'), [['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3x12/3x10'), [['סקוואט /3 10', 3, 12, null]]);
  assert.deepStrictEqual(rows('לאנג׳ 10/רגל').length, 1);
  assert.deepStrictEqual(rows('ריצה 12 קמ/ש 20 דקות').length, 1);
  assert.deepStrictEqual(rows('ריצה 5:30/ק"מ').length, 1);
  // A rest after the slash is the exercise's rest line, not a second exercise.
  assert.deepStrictEqual(rows('סקוואט 3x12 / מנוחה 30 שניות'), [SQUAT]);
  assert.deepStrictEqual(all('סקוואט 3x12 / מנוחה 30 שניות')[0].rest_seconds, 30);
  // The interval line and a date keep their slashes.
  assert.deepStrictEqual(rows('40 שניות עבודה / 20 שניות מנוחה'), []);
  assert.deepStrictEqual(rows('אימון 12/10/2026\nסקוואט 3x12'), [SQUAT]);
});
