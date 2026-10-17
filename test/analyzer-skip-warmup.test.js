'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');

// The warm-up clip is tagged core, so a legs session from the prompt engine
// used to read «ראשי: ליבה, רגליים» with 5% core volume.
test('a Warm-up phase does not count toward primary muscles or volume', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    phases: [
      { name: 'Warm-up', exercises: [{ id: 'warmup', he: 'חימום', muscles: ['core'], duration_seconds: 300 }] },
      { name: 'Main', exercises: [
        { he: 'סקוואט', muscles: ['legs'], sets: 3, reps: 10 },
        { he: 'מכרעים', muscles: ['legs'], sets: 3, reps: 10 }
      ] },
      { name: 'Cool-down', exercises: [{ he: 'מתיחת בטן', muscles: ['core'], duration_seconds: 60 }] }
    ]
  });
  assert.deepEqual(s.primary, ['legs']);
  assert.deepEqual(s.volume, { legs: 100 });
  assert.ok(s.flags.every(function (f) { return f.key !== 'no-warmup'; }));
});

test('a pasted «חימום» line in Main is left out of the muscle split', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    phases: [{ name: 'Main', exercises: [
      { name: 'חימום', sets: 1, duration_seconds: 300 },
      { name: 'סקוואט', sets: 4, reps: 5 }
    ] }]
  });
  assert.deepEqual(s.primary, ['legs']);
  assert.deepEqual(s.volume, { legs: 100 });
  assert.equal(s.durationMinutes, 8);
});

test('a workout that is only a warm-up still gets analysed', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    phases: [{ name: 'Main', exercises: [{ name: 'חימום', sets: 1, duration_seconds: 600 }] }]
  });
  assert.deepEqual(s.primary, ['core']);
  assert.equal(s.durationMinutes, 10);
});
