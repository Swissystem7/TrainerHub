const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.rest_seconds, e.notes]));
}

test('a load after a comma rides on the exercise before it', () => {
  // The load was dropped.
  for (const [text, load] of [
    ['סקוואט 3x10, 20 קג', '20 ק"ג'],
    ['סקוואט 3x10, עם 20 קילו', '20 ק"ג'],
    ['דדליפט 5x5, 100kg', '100 ק"ג'],
    ['לחיצת חזה 4x8, 12,5 קג', '12.5 ק"ג'],
  ]) {
    const out = rows(text);
    assert.strictEqual(out.length, 1, text);
    assert.deepStrictEqual(out[0].slice(0, 3), [text.split(' ').slice(0, text.startsWith('לחיצת') ? 2 : 1).join(' '), +text.match(/(\d+)x/)[1], +text.match(/x(\d+)/)[1]], text);
    assert.match(out[0][5], new RegExp(load.replace('.', '\.')), text);
  }
});

test('the load stays with its own exercise in a comma list', () => {
  const out = rows('סקוואט 3x10, 20 קג, לאנג׳ 3x12');
  assert.deepStrictEqual(out.map((r) => r.slice(0, 3)), [['סקוואט', 3, 10], ['לאנג׳', 3, 12]]);
  assert.match(out[0][5], /20 ק"ג/);
  assert.doesNotMatch(out[1][5], /ק"ג/);
});

test('exercises after a comma are unchanged', () => {
  assert.deepStrictEqual(rows('סקוואט 10, קמפינג 12').map((r) => r.slice(0, 3)), [['סקוואט', 1, 10], ['קמפינג', 1, 12]]);
});
