'use strict';
// index.html: a pasted workout keeps the load, «עד כשל», «לכל רגל» and rep
// ranges in notes, and «מתח 3xמקס» has sets but no reps. The card showed only
// sets × reps, so «לחיצת חזה 4x8 80 קג» lost its 80 kg and «מתח עד כשל» was a
// bare «מתח».

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

test('a pasted row shows its notes next to sets × reps', () => {
  const rows = pasted('לחיצת חזה 4x8 80 קג\nמתח עד כשל\nלאנג׳ 3x10 לכל רגל');
  assert.deepEqual(exerciseBits(rows['לחיצת חזה']), ['4 × 8', '80 ק"ג']);
  assert.deepEqual(exerciseBits(rows['מתח']), ['עד כשל']);
  assert.deepEqual(exerciseBits(rows['לאנג׳']), ['3 × 10', 'לכל רגל']);
});

test('sets without reps or seconds are still shown', () => {
  assert.deepEqual(exerciseBits(pasted('מתח 3xמקס')['מתח']), ['3 סטים', 'עד כשל']);
});

test('«חסר סרטון» is not repeated in the pill', () => {
  const bits = exerciseBits({ sets: 3, reps: 12, notes: 'חסר סרטון', missing: true });
  assert.deepEqual(bits, ['3 × 12']);
});

test('a built row without notes is unchanged', () => {
  assert.deepEqual(exerciseBits({ sets: 3, reps: 12, notes: null }), ['3 × 12']);
  assert.deepEqual(exerciseBits({ sets: 3, reps: null, duration_seconds: 40, notes: null }), ['3 × 40 שנ׳']);
  assert.deepEqual(exerciseBits({ sets: 1, reps: null, duration_seconds: null, notes: null }), []);
});
