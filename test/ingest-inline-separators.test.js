'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

function names(text) {
  return THIngest.ingestText(text, []).exercises.map((e) => e.name);
}

test('«|», «;», « • », «←», «->» between exercises split them like a comma', () => {
  for (const sep of [' | ', '; ', ' • ', ' · ', ' ← ', ' → ', ' -> ']) {
    const r = THIngest.ingestText('סופרמן 3x10' + sep + 'פלאנק 30 שניות', []);
    assert.deepEqual(r.exercises.map((e) => e.name), ['סופרמן', 'פלאנק'], JSON.stringify(sep));
    assert.equal(r.exercises[0].sets, 3);
    assert.equal(r.exercises[0].reps, 10);
    assert.equal(r.exercises[1].duration_seconds, 30);
  }
});

test('a rest piece after «|» is read as rest, not left in the name', () => {
  const r = THIngest.ingestText('סקוואט 15 | מנוחה 30', []);
  assert.equal(r.exercises.length, 1);
  assert.equal(r.exercises[0].name, 'סקוואט');
  assert.equal(r.exercises[0].reps, 15);
  assert.equal(r.exercises[0].rest_seconds, 30);
});

test('a «|» list after «3 סבבים:» reads the same as the comma list', () => {
  const pipe = THIngest.ingestText('3 סבבים: סקוואט 15 | פלאנק 30 שניות | מנוחה 20', []);
  const comma = THIngest.ingestText('3 סבבים: סקוואט 15, פלאנק 30 שניות, מנוחה 20', []);
  assert.deepEqual(pipe.exercises, comma.exercises);
});

test('bullet lines and a hyphenated name are unchanged', () => {
  assert.deepEqual(names('• סופרמן 3x10\n• פלאנק 30 שניות'), ['סופרמן', 'פלאנק']);
  assert.deepEqual(names('- סופרמן 3x10\n- פלאנק 30 שניות'), ['סופרמן', 'פלאנק']);
});
