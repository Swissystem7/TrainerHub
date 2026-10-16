const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [
    e.name, e.sets, e.reps, e.duration_seconds, (e.notes || '').replace(/ ?· ?חסר סרטון|^חסר סרטון$/, '') || null
  ]));
}

test('«EMOM 10 דקות» / «AMRAP 12 דקות» is the block, not an exercise', () => {
  // Was a name «EMOM 10 סקוואט» of 600 s.
  assert.deepStrictEqual(rows('EMOM 10 דקות: 10 סקוואט'), [['סקוואט', 1, 10, null, 'EMOM 10 דקות']]);
  // Was a name «AMRAP 10 ברפי» of 720 s.
  assert.deepStrictEqual(rows('AMRAP 12 דקות: 10 ברפי, 15 סקוואט'), [
    ['ברפי', 1, 10, null, 'AMRAP 12 דקות'],
    ['סקוואט', 1, 15, null, 'AMRAP 12 דקות']
  ]);
  // Was a phantom exercise «EMOM» of 600 s before the squat.
  assert.deepStrictEqual(rows('EMOM 10 דקות\n10 סקוואט\n5 שכיבות סמיכה'), [
    ['סקוואט', 1, 10, null, 'EMOM 10 דקות'],
    ['שכיבות סמיכה', 1, 5, null, 'EMOM 10 דקות']
  ]);
  assert.deepStrictEqual(rows('*AMRAP 20*\n10 ברפי'), [['ברפי', 1, 10, null, 'AMRAP 20 דקות']]);
});

test('only the exercises under the header carry it', () => {
  assert.deepStrictEqual(rows('חימום: ריצה 5 דקות\nEMOM 12:\n8 סקוואט'), [
    ['ריצה', 1, null, 300, null],
    ['סקוואט', 1, 8, null, 'EMOM 12 דקות']
  ]);
});

test('a paste without a block header is unchanged', () => {
  assert.deepStrictEqual(rows('ריצה 10 דקות'), [['ריצה', 1, null, 600, null]]);
  assert.deepStrictEqual(rows('סקוואט 3x10'), [['סקוואט', 3, 10, null, null]]);
});
