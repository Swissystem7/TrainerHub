const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds, e.notes && e.notes.replace(/ · חסר סרטון$/, '')]));
}

test('a distance in kilometres goes to the notes, with no invented reps', () => {
  // Was a name «ריצה 3 קמ» with 10 reps.
  assert.deepStrictEqual(rows('ריצה 3 קמ'), [['ריצה', 1, null, null, null, '3 ק"מ']]);
  // Was a name «ריצה 2 5 קמ» with 10 reps.
  assert.deepStrictEqual(rows('ריצה 2.5 קמ'), [['ריצה', 1, null, null, null, '2.5 ק"מ']]);
  assert.deepStrictEqual(rows('ריצה 2.5 ק"מ'), [['ריצה', 1, null, null, null, '2.5 ק"מ']]);
  assert.deepStrictEqual(rows('הליכה 1.5 קילומטר'), [['הליכה', 1, null, null, null, '1.5 ק"מ']]);
  assert.deepStrictEqual(rows('ריצה 5 קילומטרים'), [['ריצה', 1, null, null, null, '5 ק"מ']]);
  assert.deepStrictEqual(rows('אופניים 10 km'), [['אופניים', 1, null, null, null, '10 ק"מ']]);
  // Was a name «ספרינט קמ» of 3×1.
  assert.deepStrictEqual(rows('ספרינט 3x1 קמ'), [['ספרינט', 3, null, null, null, '1 ק"מ']]);
});

test('a comma-decimal distance is one exercise', () => {
  // Was two exercises «ריצה» ×2 and «קמ» ×5.
  assert.deepStrictEqual(rows('ריצה 2,5 קמ'), [['ריצה', 1, null, null, null, '2.5 ק"מ']]);
});

test('metres, loads and comma lists are unchanged', () => {
  assert.deepStrictEqual(rows('חתירה 500 מטר'), [['חתירה', 1, null, null, null, '500 מטר']]);
  assert.deepStrictEqual(rows('סקוואט 3x10 20 קילו'), [['סקוואט', 3, 10, null, null, '20 ק"ג']]);
  assert.deepStrictEqual(rows('סקוואט 10,קמפינג 12').map((r) => r.slice(0, 3)), [['סקוואט', 1, 10], ['קמפינג', 1, 12]]);
});
