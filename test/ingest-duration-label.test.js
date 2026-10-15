'use strict';
// A pasted workout has no stated length; the result card printed "זמן:  דקות".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

test('durationLabel shows the stated length, else a marked estimate, never an empty number', () => {
  assert.equal(TH.durationLabel(30, 12), '30 דקות');
  assert.equal(TH.durationLabel(null, 12), 'כ־12 דקות (הערכה)');
  assert.equal(TH.durationLabel(null, 1), 'כדקה (הערכה)');
  assert.equal(TH.durationLabel(null, 0), 'לא צוין');
  assert.equal(TH.durationLabel(undefined, undefined), 'לא צוין');
});

test('the builder card uses durationLabel and passes the analyzer estimate for a pasted workout', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /'זמן: ' \+ TH\.esc\(w\.duration_minutes\) \+ ' דקות'/);
  assert.match(html, /TH\.durationLabel\(w\.duration_minutes, exp\.durationMinutes\)/);
  assert.match(html, /durationMinutes: analysis\.durationMinutes/);
});
