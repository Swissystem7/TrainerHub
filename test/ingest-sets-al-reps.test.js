'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

require('../js/core.js');
const Ingest = require('../js/ingest.js');

const CATALOG = [
  { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4', source: 'local' }
];

function first(text) {
  return Ingest.ingestText(text, CATALOG).exercises[0];
}

test('«3 על 12» is 3 sets of 12, not a name «סקוואט 3 על» with one set', () => {
  const ex = first('סקוואט 3 על 12');
  assert.equal(ex.name, 'סקוואט');
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, 12);
});

test('«3 על 30 שניות» is 3 × 30 s and still finds the clip', () => {
  const ex = first('פלאנק 3 על 30 שניות');
  assert.equal(ex.id, 'plank');
  assert.equal(ex.sets, 3);
  assert.equal(ex.duration_seconds, 30);
});

test('«על» inside a name stays, and the rest after the count still applies', () => {
  const ex = first('עליות על ספסל 3 על 12 מנוחה 60');
  assert.equal(ex.name, 'עליות על ספסל');
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, 12);
  assert.equal(ex.rest_seconds, 60);
  assert.equal(first('קפיצה על 2 רגליים 10').name, 'קפיצה על 2 רגליים');
});
