const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function rows(text) {
  return Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds, e.notes]));
}

function expectFailure(row, name, sets) {
  assert.deepStrictEqual(row.slice(0, 4), [name, sets, null, null]);
  assert.match(row[4], /עד כשל/);
}

test('a bare «מקסימום» / «מקס» / «max» is to failure, not part of the name', () => {
  // Was a name «שכיבות סמיכה מקסימום» with 10 invented reps.
  expectFailure(rows('שכיבות סמיכה 3 סטים מקסימום')[0], 'שכיבות סמיכה', 3);
  // Was a name «מתח 3 מקס» with one set.
  expectFailure(rows('מתח 3xמקס')[0], 'מתח', 3);
  expectFailure(rows('מתח 3 x מקס')[0], 'מתח', 3);
  expectFailure(rows('דיפס 4xMAX')[0], 'דיפס', 4);
  expectFailure(rows('פלאנק 3 סטים מקסימום זמן')[0], 'פלאנק', 3);
});

test('«מקס חזרות» / «עד כשל» still read as before', () => {
  expectFailure(rows('שכיבות סמיכה מקס חזרות')[0], 'שכיבות סמיכה', 1);
  expectFailure(rows('מתח עד כשל')[0], 'מתח', 1);
  assert.deepStrictEqual(rows('סקוואט 3x12')[0].slice(0, 4), ['סקוואט', 3, 12, null]);
});
