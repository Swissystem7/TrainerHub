'use strict';

// workout-mode has two buttons side by side: «דלג» (skipCurrent: counts a
// skipped set, which the trainer sees in the completion code) and «סיימתי»
// (markSetDone: counts a completed set). On a timed step renderExercise
// relabelled the done button «דלג» too, so a trainee who cut a plank short
// with the big «דלג» got a completed set and a clean log.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name + ' exists in workout-mode.html');
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function el(extra) {
  return Object.assign({ style: {}, className: '', innerHTML: '', textContent: '', hidden: false }, extra || {});
}

function renderWith(step) {
  const label = el();
  const elements = {
    stage: el(),
    btnDone: el({ querySelector: function () { return label; } }),
    btnSwap: el(),
    liveStatus: el(),
    clockText: el(),
    clockArc: el()
  };
  const document = { getElementById: function (id) { return elements[id] || null; } };
  const run = new Function(
    'document', 'TH', 'esc', 'buildClockSVG', 'announceStatus', 'clearCountdown',
    'startCountdown', 'updateClockDisplay', 'paused', 'started', 'step',
    'var countdown = 0, countdownMax = 0;\nfunction clockLabel(s){return String(s||0);}\n' + extract('renderExercise') + '\nrenderExercise(step);'
  );
  run(
    document,
    { findExercise: function () { return null; }, mediaMarkup: function () { return ''; } },
    function (s) { return String(s == null ? '' : s); },
    function () { return ''; },
    function () {},
    function () {},
    function () {},
    function () {},
    true, false, step
  );
  return { label: label.textContent, stage: elements.stage.innerHTML };
}

test('the skip button and the done button are two different controls with two different labels', function () {
  assert.match(html, /id="btnSkip" onclick="skipCurrent\(\)"[^>]*>[\s\S]*?<span class="label">דלג<\/span>/);
  assert.match(html, /id="btnDone" onclick="markSetDone\(\)"[^>]*aria-label="סיימתי סט"/);
});

test('a timed step keeps the done button as «סיימתי», never «דלג»', function () {
  const timed = renderWith({ type: 'exercise', name: 'פלאנק', phase: 'עיקר', set: 1, totalSets: 3, reps: null, duration: 40, notes: null });
  assert.notEqual(timed.label, 'דלג');
  assert.match(timed.label, /^סיימתי/);
  assert.match(timed.stage, /clock-ring/);
});

test('a reps step still says «סיימתי סט»', function () {
  const reps = renderWith({ type: 'exercise', name: 'סקוואט', phase: 'עיקר', set: 2, totalSets: 3, reps: '8-12', duration: null, notes: null });
  assert.equal(reps.label, 'סיימתי סט');
  assert.match(reps.stage, /חזרות/);
});

test('renderExercise never writes «דלג» into the done button', function () {
  const src = extract('renderExercise');
  assert.doesNotMatch(src, /textContent\s*=\s*[^;]*'דלג'/);
});
