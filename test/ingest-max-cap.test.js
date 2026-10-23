const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function row(text) {
  const e = Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises)[0];
  return [e.name, e.sets, e.reps, e.duration_seconds, e.notes];
}

function expectCap(text, name, sets, reps, secs, note) {
  const r = row(text);
  assert.deepStrictEqual(r.slice(0, 4), [name, sets, reps, secs]);
  assert.match(r[4], new RegExp(note));
  assert.doesNotMatch(r[4], /עד כשל/);
}

test('«מקסימום N» caps the count, it is not to failure', () => {
  // The note said «עד כשל» next to 20 reps.
  expectCap('שכיבות סמיכה מקסימום 20', 'שכיבות סמיכה', 1, 20, null, 'עד 20');
  expectCap('שכיבות סמיכה 3 סטים מקסימום 15', 'שכיבות סמיכה', 3, 15, null, 'עד 15');
  expectCap('מתח מקס 8', 'מתח', 1, 8, null, 'עד 8');
  expectCap('מתח max 12', 'מתח', 1, 12, null, 'עד 12');
  expectCap('פלאנק מקסימום 60 שניות', 'פלאנק', 1, null, 60, 'עד 60 שניות');
  expectCap('סקוואט 20 חזרות מקסימום', 'סקוואט', 1, 20, null, 'עד 20 חזרות');
});

test('a bare «מקסימום» / «3xמקס» / «3 מקס» with no unit is still to failure', () => {
  assert.match(row('שכיבות סמיכה מקסימום')[4], /עד כשל/);
  assert.match(row('מתח 3xמקס')[4], /עד כשל/);
  assert.match(row('שכיבות סמיכה מקסימום חזרות')[4], /עד כשל/);
  assert.match(row('מתח 3 מקס')[4], /עד כשל/);
});
