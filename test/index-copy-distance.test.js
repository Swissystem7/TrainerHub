'use strict';
// frontend/index.html: a distance row from the Studio parser («ספרינט 6x50 מ'»,
// «לאנג'ים הליכה 20 מטר») has no reps or seconds - the distance is in notes.
// The card showed nothing in its details column, so «6x50» lost its 6 sets, and
// «העתק» copied the bare name («- ספרינט») without the distance at all.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');

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

const exerciseDetailBits = new Function(extractBlock('function exerciseDetailBits(ex)') + '; return exerciseDetailBits;')();

function runCopy(workout) {
  const listener = extractBlock("$('copyBtn').addEventListener('click', function () ");
  const fnSrc = listener.slice(listener.indexOf('function () '));
  let copied = null;
  const TH = {
    phaseLabel: function (name) { return ({ 'Warm-up': 'חימום', 'Main': 'עיקר', 'Cool-down': 'שחרור' })[name] || name; },
    copyOrShow: function (text) { copied = text; }
  };
  const $ = function () { return { textContent: '' }; };
  new Function('$', 'TH', 'currentWorkout', 'exerciseDetailBits', 'setTimeout', 'return ' + fnSrc)(
    $, TH, workout, exerciseDetailBits, function () {})();
  return copied;
}

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'frontend', 'parse-workout.js'), 'utf8'), ctx);
const parsed = ctx.window.parseWorkoutClient("אימון ריצה 40 דקות\nספרינט 6x50 מ'\nלאנג'ים הליכה 20 מטר");
const byName = {};
parsed.phases.forEach(function (ph) { ph.exercises.forEach(function (ex) { byName[ex.name] = ex; }); });

test('the card details keep the sets of a distance row', () => {
  assert.deepEqual(exerciseDetailBits(byName['ספרינט']), ['6 סטים']);
  assert.deepEqual(exerciseDetailBits(byName["לאנג'ים הליכה"]), []);
  assert.deepEqual(exerciseDetailBits({ sets: 4, rest_seconds: 60, notes: '200 מטר' }), ['4 סטים', 'מנוחה 60″']);
});

test('the copied text carries the distance and its sets', () => {
  const text = runCopy({
    title: 'אימון ריצה',
    phases: [{ name: 'Main', exercises: [byName['ספרינט'], byName["לאנג'ים הליכה"]] }]
  });
  assert.equal(text, "אימון ריצה\n\nעיקר\n- ספרינט 6 סטים (50 מ')\n- לאנג'ים הליכה (20 מטר)\n\n");
});

test('rows with reps or seconds are copied as before, plus their notes', () => {
  assert.deepEqual(exerciseDetailBits({ sets: 3, reps: 12 }), ['3×12']);
  assert.deepEqual(exerciseDetailBits({ sets: 3, duration_seconds: 30 }), ['3×30″']);
  const text = runCopy({ title: 'אימון', phases: [{ name: 'Main', exercises: [
    { name: 'סקוואט', sets: 3, reps: 12 },
    { name: 'פלאנק', sets: 1, duration_seconds: 45, notes: 'גב ישר' }
  ] }] });
  assert.equal(text, 'אימון\n\nעיקר\n- סקוואט 3×12\n- פלאנק 45″ (גב ישר)\n\n');
});
