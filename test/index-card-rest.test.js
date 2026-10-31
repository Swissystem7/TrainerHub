'use strict';
// index.html: the workout card showed sets × reps but never the rest, so a
// pasted «שכיבות סמיכה 3x10 מנוחה 60 שניות» read «3 × 10» while the print
// sheet and weekly.html said «מנוחה 60 שנ׳». Built sessions lost it too.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function extractBlock(marker) {
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, 'marker not found: ' + marker);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced braces after ' + marker);
}

const exerciseBits = new Function(extractBlock('function exerciseBits(ex)') + '; return exerciseBits;')();
const THIngest = require('../js/ingest.js');

function pasted(text) {
  const byName = {};
  THIngest.ingestText(text).workout.phases.forEach(function (ph) {
    ph.exercises.forEach(function (ex) { byName[ex.name] = ex; });
  });
  return byName;
}

test('a pasted row shows its rest next to sets × reps', () => {
  const rows = pasted('שכיבות סמיכה 3x10 מנוחה 60 שניות\nסקוואט 4x8 מנוחה דקה');
  assert.deepEqual(exerciseBits(rows['שכיבות סמיכה']), ['3 × 10', 'מנוחה 60 שנ׳']);
  assert.deepEqual(exerciseBits(rows['סקוואט']), ['4 × 8', 'מנוחה 60 שנ׳']);
});

test('a timed row and a built row show their rest too', () => {
  assert.deepEqual(exerciseBits({ sets: 3, reps: null, duration_seconds: 40, rest_seconds: 60 }), ['3 × 40 שנ׳', 'מנוחה 60 שנ׳']);
  assert.deepEqual(exerciseBits({ sets: 2, reps: '8-12', rest_seconds: 60, notes: null }), ['2 × 8-12', 'מנוחה 60 שנ׳']);
});

test('a row without rest adds nothing', () => {
  assert.deepEqual(exerciseBits({ sets: 1, reps: null, duration_seconds: 180, rest_seconds: null }), ['1 × 180 שנ׳']);
  assert.deepEqual(exerciseBits({ sets: 4, reps: 8, rest_seconds: 0, notes: '80 ק"ג' }), ['4 × 8', '80 ק"ג']);
});
