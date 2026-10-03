'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../js/analyzer.js');

test('analyzeSession volume is weighted by sets, not exercise count', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    duration_minutes: 20,
    phases: [{
      name: 'Main',
      exercises: [
        { name: 'סקוואט', sets: 5, reps: 10 },
        { name: 'שכיבות שמיכה', sets: 1, reps: 10 }
      ]
    }]
  });
  assert.deepEqual(s.volume, { legs: 83, chest: 17 });
});

test('analyzeSession core volume and flags respect set-weighted split', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    duration_minutes: 20,
    phases: [{
      name: 'Main',
      exercises: [
        { name: 'פלאנק', sets: 1, duration_seconds: 40 },
        { name: 'בטן', sets: 1, reps: 15 },
        { name: 'פלאנק צידי', sets: 1, duration_seconds: 30 },
        { name: 'שכיבות שמיכה', sets: 5, reps: 10 }
      ]
    }]
  });
  assert.equal(s.volume.core, 38);
  assert.ok(s.flags.every(function (f) { return !/^core-heavy/.test(f.key); }));
});

test('analyzeSession treats null, zero, or non-numeric sets as one set', function () {
  const s = Analyzer.analyzeSession({
    title: 't',
    duration_minutes: 20,
    phases: [{
      name: 'Main',
      exercises: [
        { name: 'סקוואט', sets: null, reps: 10 },
        { name: 'שכיבות שמיכה', sets: 0, reps: 10 },
        { name: 'פלאנק', sets: 'x', duration_seconds: 40 }
      ]
    }]
  });
  assert.equal(s.volume.legs, 33);
  assert.equal(s.volume.chest, 33);
  assert.equal(s.volume.core, 33);
});

test('equal-sets core workout still reports high core volume and core-heavy flag', function () {
  const workout = {
    title: 'אימון ליבה',
    duration_minutes: 20,
    phases: [
      { name: 'Main', exercises: [
        { name: 'פלאנק', sets: 3, duration_seconds: 40 },
        { name: 'מטפס הרים', sets: 3, reps: 15 },
        { name: 'בטן', sets: 3, reps: 15 },
        { name: 'פלאנק צידי', sets: 3, duration_seconds: 30 }
      ] }
    ]
  };
  const s = Analyzer.analyzeSession(workout);
  assert.ok(s.volume.core >= 70);
  assert.ok(s.flags.some(function (f) { return /ליבה/.test(f.he) && /גב/.test(f.he); }));
});
