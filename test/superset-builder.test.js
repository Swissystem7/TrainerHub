const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const SupersetBuilder = require('../js/superset-builder.js');

test('Superset: pairs antagonist chest and back exercises correctly', () => {
  const exercises = [
    { id: 'chest-press', name: 'שכיבות שמיכה', muscles: ['chest'] },
    { id: 'back-pull', name: 'מתח', muscles: ['back'] },
    { id: 'biceps-curl', name: 'כפיפת מרפקים', muscles: ['biceps'] }
  ];
  const res = SupersetBuilder.pairAntagonistExercises(exercises);
  assert.equal(res.pairs.length, 1);
  assert.equal(res.pairs[0][0].id, 'chest-press');
  assert.equal(res.pairs[0][1].id, 'back-pull');
  assert.ok(res.timeSavedPercent > 0);
});

test('Superset: avoids pairing exercises from the same muscle group', () => {
  const exercises = [
    { id: 'chest-1', name: 'חזה 1', muscles: ['chest'] },
    { id: 'chest-2', name: 'חזה 2', muscles: ['chest'] }
  ];
  const res = SupersetBuilder.pairAntagonistExercises(exercises);
  assert.equal(res.pairs.length, 0);
  assert.equal(res.unpaired.length, 2);
  assert.equal(res.timeSavedPercent, 0);
});

test('Superset: calculates shortened workout time percentages', () => {
  const exercises = [
    { id: 'c1', muscles: ['chest'] },
    { id: 'b1', muscles: ['back'] },
    { id: 'l1', muscles: ['legs'] },
    { id: 'co1', muscles: ['core'] }
  ];
  const res = SupersetBuilder.pairAntagonistExercises(exercises);
  assert.equal(res.pairs.length, 2);
  assert.equal(res.timeSavedPercent, 25);
});

test('Superset: handles empty list or single exercise gracefully', () => {
  const emptyRes = SupersetBuilder.pairAntagonistExercises([]);
  assert.deepEqual(emptyRes.pairs, []);
  assert.equal(emptyRes.timeSavedPercent, 0);

  const singleRes = SupersetBuilder.pairAntagonistExercises([{ id: 'ex1', muscles: ['chest'] }]);
  assert.deepEqual(singleRes.pairs, []);
  assert.equal(singleRes.unpaired.length, 1);
  assert.equal(singleRes.timeSavedPercent, 0);
});

test('Superset: index.html contains superset button and output elements', () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const htmlContent = fs.readFileSync(indexPath, 'utf8');
  assert.ok(htmlContent.includes('id="supersetModeBtn"'));
  assert.ok(htmlContent.includes('id="supersetPairsOut"'));
});

test('Superset: additional test case for edge scenarios', () => {
  const exercises = [
    { id: 'ex-1', muscles: ['chest'] },
    { id: 'ex-2', muscles: ['back'] }
  ];
  const res = SupersetBuilder.pairAntagonistExercises(exercises);
  assert.equal(res.pairs.length, 1);
});
