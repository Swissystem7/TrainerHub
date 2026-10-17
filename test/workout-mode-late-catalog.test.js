'use strict';

// workout-mode re-rendered the whole step when the catalog finished loading:
// TH.ready(function () { renderStep(); }). The catalog is fetched, so on a slow
// gym connection it lands after the trainee tapped start; renderStep() then
// restarted a running 60-second plank from 60, and once the last step was done
// it ran finishWorkout() again. The callback now only refreshes the clip slot.

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

// The callback the page hands to TH.ready, read from the DOMContentLoaded handler.
function readyCallback() {
  const m = html.match(/TH\.ready\(([\s\S]*?)\);\s*\n/);
  assert.ok(m, 'workout-mode.html registers a TH.ready callback');
  return m[1].trim();
}

function run(stepIdx, steps) {
  const src = [
    'const calls = []; const slot = { innerHTML: "" };',
    'const document = { getElementById: function (id) { return id === "exMediaSlot" ? slot : null; } };',
    'const TH = { findExercise: function (s) { return { id: s.id }; },',
    '  mediaMarkup: function (c) { return "<video " + c.id + ">"; } };',
    'const workout = {};',
    'function renderStep() { calls.push("renderStep"); }',
    'function finishWorkout() { calls.push("finishWorkout"); }',
    'function startCountdown() { calls.push("startCountdown"); }',
    extract('refreshStepMedia'),
    'const cb = ' + readyCallback() + ';',
    'cb();',
    'return { calls: calls, slot: slot.innerHTML };'
  ].join('\n');
  return new Function('stepIdx', 'steps', src)(stepIdx, steps);
}

test('a catalog that lands mid-plank shows the clip without restarting the step', function () {
  const r = run(0, [{ type: 'exercise', id: 'plank', duration: 60 }]);
  assert.deepEqual(r.calls, []);
  assert.equal(r.slot, '<video plank>');
});

test('a catalog that lands after the last step does not finish the workout again', function () {
  const r = run(1, [{ type: 'exercise', id: 'plank', duration: 60 }]);
  assert.deepEqual(r.calls, []);
});

test('a catalog that lands during a rest leaves the rest clock alone', function () {
  const r = run(0, [{ type: 'rest', duration: 90 }]);
  assert.deepEqual(r.calls, []);
});
