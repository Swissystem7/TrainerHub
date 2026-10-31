'use strict';

// workout-mode drew a timed step's clock ring in bare seconds whatever the
// length: a 20-minute run started at «1200» and a 3-minute rest at «180». From
// a minute up the ring now reads m:ss («20:00», «3:00») for the whole step.

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

// Runs the real updateClockDisplay against a stub DOM and returns the ring text.
function draw(val, max) {
  const src = [
    'const textEl = { textContent: "" };',
    'const document = { getElementById: function (id) { return id === "clockText" ? textEl : null; } };',
    'function announceTimer() {}',
    extract('formatTime'),
    extract('clockLabel'),
    extract('updateClockDisplay'),
    'updateClockDisplay(val, max);',
    'return String(textEl.textContent);'
  ].join('\n');
  return new Function('val', 'max', src)(val, max);
}

test('a 20-minute run starts the ring at 20:00, not 1200', function () {
  assert.equal(draw(1200, 1200), '20:00');
  assert.equal(draw(1199, 1200), '19:59');
});

test('a minute-plus step keeps m:ss through its last seconds', function () {
  assert.equal(draw(180, 180), '3:00');
  assert.equal(draw(45, 90), '0:45');
  assert.equal(draw(0, 60), '0:00');
});

test('a short hold still counts in bare seconds', function () {
  assert.equal(draw(30, 30), '30');
  assert.equal(draw(5, 45), '5');
});

test('the first frame of an exercise and a rest uses the same label', function () {
  assert.match(html, /id="clockText"[^>]*>\$\{clockLabel\(step\.duration, step\.duration\)\}<\/div>/);
  assert.equal(html.match(/clockLabel\(step\.duration, step\.duration\)/g).length, 2);
});
