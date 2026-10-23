const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

function row(text) {
  const e = Ingest.ingestText(text).workout.phases.flatMap((p) => p.exercises)[0];
  return [e.name, e.sets, e.reps, e.duration_seconds, e.notes];
}

test('a small count next to «מקס» / «עד כשל» is the sets, not reps to failure', () => {
  // Was 1 set of 3 reps with the note «עד כשל».
  for (const text of ['מתח 3 מקס', 'מתח 3 עד כשל', '3 מתח עד כשל', 'מתח 3 מקס, מנוחה 60 שניות']) {
    const r = row(text);
    assert.deepStrictEqual(r.slice(0, 4), ['מתח', 3, null, null], text);
    assert.match(r[4], /עד כשל/);
  }
  assert.deepStrictEqual(row('שכיבות סמיכה 4 עד כשל').slice(0, 4), ['שכיבות סמיכה', 4, null, null]);
});

test('a rep-sized count, a cap and explicit sets are unchanged', () => {
  assert.deepStrictEqual(row('שכיבות סמיכה 20 עד כשל').slice(0, 4), ['שכיבות סמיכה', 1, 20, null]);
  assert.deepStrictEqual(row('מתח מקס 8').slice(0, 4), ['מתח', 1, 8, null]);
  assert.deepStrictEqual(row('מתח 3 סטים מקס').slice(0, 4), ['מתח', 3, null, null]);
  assert.deepStrictEqual(row('מתח 3xמקס').slice(0, 4), ['מתח', 3, null, null]);
});
