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

function rows(text) {
  return Ingest.ingestText(text, TH.catalog).workout.phases[1].exercises.map(function (ex) {
    return [ex.name, ex.id, ex.reps, ex.duration_seconds, ex.rest_seconds];
  });
}

test('a work/rest line with colons gives its times to every exercise', () => {
  // Was plank 10 reps, rest 60: «עבודה:» / «מנוחה:» were not read, the bare 20 fell back to 60.
  assert.deepStrictEqual(rows('עבודה: 40 שניות, מנוחה: 20\nפלאנק\nכתפיים וגב'), [
    ['פלאנק', 'plank', null, 40, 20],
    ['כתפיים וגב', 'כתפיים_וגב', null, 40, 20]
  ]);
  assert.deepStrictEqual(rows('עבודה: 40 שנ׳\nפלאנק'), [['פלאנק', 'plank', null, 40, null]]);
  // Was rest null: the first-line colon cut «מנוחה» off and nothing read the 30 seconds.
  assert.deepStrictEqual(rows('מנוחה: 30 שניות\nפלאנק 30 שניות'), [['פלאנק', 'plank', null, 30, 30]]);
  assert.deepStrictEqual(rows('מנוחה: 1:30\nפלאנק'), [['פלאנק', 'plank', 10, null, 90]]);
  assert.deepStrictEqual(rows('פלאנק 30 שניות\nמנוחה: דקה\nפלאנק ברכיים 20 שניות'), [
    ['פלאנק', 'plank', null, 30, 60],
    ['פלאנק ברכיים', 'פלאנק_ברכיים', null, 20, 60]
  ]);
});

test('the work/rest line is not an exercise', () => {
  // Was a first exercise «עבודה» on the «עבודה עם יד אחת» clip.
  assert.deepStrictEqual(rows('עבודה 40 שניות מנוחה 20 שניות\nפלאנק'), [['פלאנק', 'plank', null, 40, 20]]);
  // Was a clip-less exercise «עבודה /».
  assert.deepStrictEqual(rows('40 שניות עבודה / 20 שניות מנוחה\nפלאנק'), [['פלאנק', 'plank', null, 40, 20]]);
  // A clip whose name starts with «עבודה» stays an exercise.
  assert.deepStrictEqual(rows('עבודה עם יד אחת 30 שניות'), [['עבודה עם יד אחת', 'עבודה_עם_יד_אחת', null, 30, null]]);
});

test('a colon on a later line does not cut the lines above it', () => {
  // Was only «גב ישר»: «פלאנק 30 שניות\nפלאנק ברכיים 20\nדגש» was read as a title.
  assert.deepStrictEqual(rows('פלאנק 30 שניות\nפלאנק ברכיים 20\nדגש: גב ישר').slice(0, 2), [
    ['פלאנק', 'plank', null, 30, null],
    ['פלאנק ברכיים', 'פלאנק_ברכיים', 20, null, null]
  ]);
  // Was plank only: the rest clause put «מנוחה» in front of the colon.
  assert.deepStrictEqual(rows('לאנג׳ 10 חזרות מנוחה: 30 שניות\nפלאנק 20 שניות').map((r) => r[0]), ['לאנג׳', 'פלאנק']);
  assert.deepStrictEqual(rows('לאנג׳ 10 חזרות מנוחה: 30 שניות')[0].slice(2), [10, null, 30]);
  // The interval prefix and the title on the first line are still cut.
  assert.deepStrictEqual(rows('40 שניות עבודה 20 מנוחה: פלאנק, כתפיים וגב').map((r) => [r[0], r[3]]), [['פלאנק', 40], ['כתפיים וגב', 40]]);
  assert.deepStrictEqual(rows('אימון בטן: פלאנק 30 שניות').map((r) => r[0]), ['פלאנק']);
});
