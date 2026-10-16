'use strict';

// workout-mode refilled the clock ring after a pause: resumeCurrentStep called
// startCountdown(countdown, ...) and startCountdown took the remaining seconds
// as the full length. A 60-second plank paused at 20 resumed with a full ring
// that drained over 20 seconds, so the trainee saw a fresh hold, not the last third.

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

// Runs the real startCountdown / resumeCurrentStep with a fake clock and
// returns what the ring was drawn with on each tick.
function run(step, remaining) {
  const src = [
    'let countdown = 0, countdownMax = 0, countdownInterval = null, stepIdx = 0;',
    'const drawn = []; let tick = null;',
    'function setInterval(fn) { tick = fn; return 1; }',
    'function clearInterval() { tick = null; }',
    'function updateClockDisplay(val, max) { drawn.push([val, max]); }',
    'function markSetDone() {} function advance() {}',
    extract('clearCountdown'),
    extract('startCountdown'),
    extract('resumeCurrentStep'),
    'countdown = remaining; countdownMax = step.duration;',
    'resumeCurrentStep();',
    'tick();',
    'return drawn;'
  ].join('\n');
  return new Function('steps', 'step', 'remaining', src)([step], step, remaining);
}

test('a timed exercise paused at 20 of 60 resumes with the ring a third full', function () {
  const drawn = run({ type: 'exercise', duration: 60 }, 20);
  assert.deepEqual(drawn[0], [20, 60]);
  assert.deepEqual(drawn[1], [19, 60]);
});

test('a rest paused at 45 of 90 resumes with the ring half full', function () {
  const drawn = run({ type: 'rest', duration: 90 }, 45);
  assert.deepEqual(drawn[0], [45, 90]);
});

test('a fresh start still counts from the full length', function () {
  const drawn = run({ type: 'exercise', duration: 30 }, 0);
  assert.deepEqual(drawn[0], [30, 30]);
});
