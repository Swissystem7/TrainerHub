'use strict';

// «ברפי» is the usual Hebrew spelling of the burpee (the ingest examples and the
// booklet's «ברפיז» use it), but the rules only knew «בורפי». A pasted «ברפי 3x10»
// came out as a core exercise in reps, not a leg + core jump drill, so a session of
// burpees and jumps lost its plyo intensity and its leg volume.

const test = require('node:test');
const assert = require('node:assert/strict');
const Infer = require('../js/infer.js');
const Ingest = require('../js/ingest.js');
const Analyzer = require('../js/analyzer.js');

test('«ברפי» and «ברפיז» infer like «בורפי»: legs + core, plyo', function () {
  const ref = Infer.inferFromName('בורפי');
  ['ברפי', 'ברפיז', '10 ברפי', 'ברפי עם קפיצה'].forEach(function (name) {
    const r = Infer.inferFromName(name);
    assert.deepEqual(r.muscles, ref.muscles, name);
    assert.equal(r.pattern, 'plyo', name);
    assert.equal(r.he, name.trim(), 'the name itself is kept as written');
  });
  assert.deepEqual(ref.muscles, ['legs', 'core']);
});

test('a pasted «ברפי 3x10» is a leg + core plyo drill in the session analysis', function () {
  const out = Ingest.ingestText('ברפי 3x10\nשכיבות סמיכה 3x10\nסקוואט 3x15');
  const s = Analyzer.analyzeSession(out.workout);
  const burpee = s.exercises.filter(function (e) { return e.he === 'ברפי'; })[0];
  assert.ok(burpee, 'burpee line analysed');
  assert.equal(burpee.primary, 'legs');
  assert.equal(burpee.pattern, 'plyo');
  assert.equal(s.volume.core, undefined, 'no core-only volume from the burpee');
});
