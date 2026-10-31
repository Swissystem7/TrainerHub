'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');
const Ingest = require('../js/ingest.js');

// A pasted «שחרור 5 דקות» line lands in Main and was read as a 5-minute core
// hold, so a legs session showed «ראשי: רגליים, ליבה» with 10% core.
test('a pasted «שחרור» line in Main is left out of the muscle split', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    phases: [{ name: 'Main', exercises: [
      { name: 'סקוואט', sets: 3, reps: 10 },
      { name: 'מכרעים', sets: 3, reps: 10 },
      { name: 'שחרור', sets: 1, duration_seconds: 300 }
    ] }]
  });
  assert.deepEqual(s.primary, ['legs']);
  assert.deepEqual(s.volume, { legs: 100 });
});

test('«מתיחות 5 דקות» after a pasted workout is not core volume', function () {
  const w = Ingest.ingestText('חימום 5 דקות\nמתח 3x8\nשכיבות סמיכה 3x12\nמתיחות 5 דקות').workout;
  const s = Analyzer.analyzeSession(w);
  assert.deepEqual(s.primary, ['back', 'chest']);
  assert.deepEqual(s.volume, { back: 50, chest: 50 });
  assert.equal(s.durationMinutes, 16);
});

test('a named stretch or a core move is still counted', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    phases: [{ name: 'Main', exercises: [
      { name: 'סקוואט', sets: 3, reps: 10 },
      { name: 'פלאנק', sets: 3, duration_seconds: 30 }
    ] }]
  });
  assert.deepEqual(s.primary, ['legs', 'core']);
});
