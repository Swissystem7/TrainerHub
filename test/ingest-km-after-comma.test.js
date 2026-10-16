const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.duration_seconds, e.reps, e.notes]));
}

test('a distance after a comma rides on the exercise before it', () => {
  // The distance was dropped.
  for (const [text, name, secs, km] of [
    ['ריצה 20 דקות, 3 קמ', 'ריצה', 1200, '3 ק"מ'],
    ['ריצה 20 דקות, 2.5 ק"מ', 'ריצה', 1200, '2.5 ק"מ'],
    ['ריצה 20 דקות, 2,5 קמ', 'ריצה', 1200, '2.5 ק"מ'],
    ['הליכה 30 דקות, 5 קילומטר', 'הליכה', 1800, '5 ק"מ'],
  ]) {
    const out = rows(text);
    assert.strictEqual(out.length, 1, text);
    assert.deepStrictEqual(out[0].slice(0, 2), [name, secs], text);
    assert.ok(out[0][3].includes(km), text + ' -> ' + out[0][3]);
  }
});

test('the distance stays with its own exercise in a comma list', () => {
  const out = rows('ריצה 20 דקות, 3 קמ, סקוואט 10');
  assert.deepStrictEqual(out.map((r) => r.slice(0, 3)), [['ריצה', 1200, null], ['סקוואט', null, 10]]);
  assert.ok(out[0][3].includes('3 ק"מ'));
  assert.ok(!out[1][3].includes('ק"מ'));
});
