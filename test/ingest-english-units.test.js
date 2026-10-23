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

test('English reps / sec / min after a count are the Hebrew units, not part of the name', () => {
  // The corpus paste: was «סקוואט reps» 3x12 and «plank sec» with 3 sets of 30 reps and no clip.
  assert.deepStrictEqual(rows('סקוואט 3 x 12 reps\npush ups 3 x 10\nplank 3 x 30 sec'), [SQUAT, ['push ups', 3, 10, null], ['plank', 3, null, 30]]);
  assert.deepStrictEqual(all('plank 3 x 30 sec')[0].id, 'plank');
  assert.deepStrictEqual(rows('פלאנק 30 sec'), [['פלאנק', 1, null, 30]]);
  assert.deepStrictEqual(rows('plank 45 seconds'), [['plank', 1, null, 45]]);
  assert.deepStrictEqual(rows('plank 30s'), [['plank', 1, null, 30]]);
  assert.deepStrictEqual(rows('פלאנק 3x30sec'), [['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3x12reps'), [SQUAT]);
  assert.deepStrictEqual(rows('run 5 min'), [['run', 1, null, 300]]);
  assert.deepStrictEqual(rows('פלאנק 2 min'), [['פלאנק', 1, null, 120]]);
  assert.deepStrictEqual(rows('ריצה 20 minutes'), [['ריצה', 1, null, 1200]]);
});

test('English sets / rounds / of are the Hebrew words', () => {
  // Was a name «squat 3 sets reps» of 12, «squat 3 sets of 12 reps» with 10 invented reps.
  assert.deepStrictEqual(rows('squat 3 sets x 12 reps'), [['squat', 3, 12, null]]);
  assert.deepStrictEqual(rows('squat 3 sets of 12 reps'), [['squat', 3, 12, null]]);
  assert.deepStrictEqual(rows('סקוואט 3 sets 12 reps'), [SQUAT]);
  assert.deepStrictEqual(rows('burpees 10 reps x 3 sets'), [['burpees', 3, 10, null]]);
  // A rounds header was a phantom exercise «rounds» of 3 reps; a rest line in English a phantom «sec».
  assert.deepStrictEqual(rows('3 rounds:\nסקוואט 15\nפלאנק 30 sec'), [['סקוואט', 3, 15, null], ['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('3 sets:\nסקוואט 15\nפלאנק 30 שניות'), [['סקוואט', 3, 15, null], ['פלאנק', 3, null, 30]]);
  assert.deepStrictEqual(rows('סקוואט 3x12\nמנוחה 60 sec'), [SQUAT]);
  assert.deepStrictEqual(all('סקוואט 3x12\nמנוחה 60 sec')[0].rest_seconds, 60);
});

test('only a whole English unit word right after a digit is read', () => {
  assert.deepStrictEqual(rows('5 minimum ברפי'), [['minimum ברפי', 1, 5, null]]);
  assert.deepStrictEqual(note('ריצה 5 km'), ['5 ק"מ']);
  assert.deepStrictEqual(note('דדליפט 5x5 60 kg'), ['60 ק"ג']);
  assert.deepStrictEqual(note('EMOM 10 min:\n5 ברפי'), ['EMOM 10 דקות']);
  assert.deepStrictEqual(note('AMRAP 12 min\n5 ברפי'), ['AMRAP 12 דקות']);
  assert.deepStrictEqual(note('דדליפט 5x5 RPE 8'), ['RPE 8']);
  assert.deepStrictEqual(rows('פלאנק 30 שניות'), [['פלאנק', 1, null, 30]]);
});
