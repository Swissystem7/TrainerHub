'use strict';
// frontend/index.html: the «העתק» button copies the workout as plain text.
// It used to format exercises with its own rules, different from the card on
// screen: a reps-only row lost its "N חזרות", a timed row in 3 rounds was
// copied as "30 שנ׳" with no rounds, and rest was dropped entirely. Both the
// card and the copy text now go through exerciseDetailBits().

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'index.html'), 'utf8');

// Return the source of a function/handler starting at `marker`, up to the
// matching closing brace of its first `{`.
function extractBlock(marker) {
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, 'marker not found: ' + marker);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error('unbalanced braces after ' + marker);
}

const exerciseDetailBits = new Function(extractBlock('function exerciseDetailBits(ex)') + '; return exerciseDetailBits;')();

// The click handler: `$('copyBtn').addEventListener('click', function () {...})`.
// Rebuild it as a function of its free variables and capture the copied text.
function runCopy(workout) {
  const listener = extractBlock("$('copyBtn').addEventListener('click', function () ");
  const fnSrc = listener.slice(listener.indexOf('function () '));
  let copied = null;
  const TH = {
    phaseLabel: function (name) { return ({ 'Warm-up': 'חימום', 'Main': 'עיקר', 'Cool-down': 'שחרור' })[name] || name; },
    copyOrShow: function (text) { copied = text; }
  };
  const $ = function () { return { textContent: '' }; };
  const handler = new Function('$', 'TH', 'currentWorkout', 'exerciseDetailBits', 'setTimeout', 'return ' + fnSrc)(
    $, TH, workout, exerciseDetailBits, function () {});
  handler();
  return copied;
}

test('exerciseDetailBits mirrors every detail the card shows', () => {
  assert.deepEqual(exerciseDetailBits({ sets: 3, reps: 12 }), ['3×12']);
  assert.deepEqual(exerciseDetailBits({ sets: 1, reps: 15 }), ['1×15']);
  assert.deepEqual(exerciseDetailBits({ reps: 20 }), ['20 חזרות']);
  assert.deepEqual(exerciseDetailBits({ sets: 1, duration_seconds: 180 }), ['180″']);
  assert.deepEqual(exerciseDetailBits({ sets: 3, duration_seconds: 30, rest_seconds: 15 }), ['3×30″', 'מנוחה 15″']);
  assert.deepEqual(exerciseDetailBits({ sets: 3, reps: 10, rest_seconds: 60 }), ['3×10', 'מנוחה 60″']);
  assert.deepEqual(exerciseDetailBits({ name: 'x' }), []);
});

test('the card render uses the same formatter as the copy text', () => {
  const render = extractBlock('function renderCard(w, usedFallback)');
  assert.match(render, /exerciseDetailBits\(ex\)\.map\(TH\.esc\)/);
  assert.doesNotMatch(render, /חזרות'\)/, 'renderCard formats details on its own again');
});

test('copied text keeps reps-only rows, rounds of timed work and rest', () => {
  const text = runCopy({
    title: 'אימון בוקר',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'ריצה קלה', sets: 1, reps: null, duration_seconds: 180 }] },
      { name: 'Main', exercises: [
        { name: 'סקוואט', sets: 3, reps: 12, rest_seconds: 60 },
        { name: 'ברפי', reps: 20 },
        { name: 'פלאנק', sets: 3, reps: null, duration_seconds: 30, rest_seconds: 15 }
      ] }
    ]
  });
  assert.equal(text,
    'אימון בוקר\n\n' +
    'חימום\n- ריצה קלה 180″\n\n' +
    'עיקר\n- סקוואט 3×12 · מנוחה 60″\n- ברפי 20 חזרות\n- פלאנק 3×30″ · מנוחה 15″\n\n');
});

test('an exercise with no numbers is copied as its bare name', () => {
  const text = runCopy({ title: 'אימון', phases: [{ name: 'Main', exercises: [{ name: 'הליכה' }] }] });
  assert.equal(text, 'אימון\n\nעיקר\n- הליכה\n\n');
});
