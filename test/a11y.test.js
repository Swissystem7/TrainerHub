'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = {
  weekly: fs.readFileSync(path.join(root, 'index.html'), 'utf8'),
  studio: fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8'),
  workout: fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8')
};
const css = fs.readFileSync(path.join(root, 'css', 'app.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function inputs(html) {
  return [...html.matchAll(/<(input|textarea|select)\b([^>]*)>/gi)].map(function (m) {
    return { tag: m[1].toLowerCase(), attrs: m[2], raw: m[0] };
  });
}

function hasLabel(html, id) {
  if (!id) return false;
  const forRe = new RegExp('for="' + id + '"');
  const ariaRe = new RegExp('id="' + id + '"[^>]*(aria-label|aria-labelledby)=');
  const labelledRe = new RegExp('(aria-label|aria-labelledby)="[^"]+"[^>]*id="' + id + '"');
  return forRe.test(html) || ariaRe.test(html) || labelledRe.test(html);
}

test('npm test runs node --test over the test directory glob', function () {
  assert.equal(pkg.scripts.test, 'node --test test/*.js');
});

test('every page is Hebrew RTL', function () {
  for (const [name, html] of Object.entries(pages)) {
    assert.match(html, /lang="he"/, name);
    assert.match(html, /dir="rtl"/, name);
  }
});

test('workout-mode advances with space/enter and pauses with escape', function () {
  const html = pages.workout;
  assert.match(html, /e\.key === 'Escape'/);
  assert.match(html, /e\.key === ' ' \|\| e\.key === 'Enter'/);
  assert.match(html, /togglePause\(\)/);
  assert.match(html, /markSetDone\(\)/);
  assert.match(html, /רווח או Enter להתקדם/);
});

test('timers and set counters expose aria-live regions', function () {
  const html = pages.workout;
  assert.match(html, /id="liveStatus"[^>]*aria-live="polite"/);
  assert.match(html, /id="liveTimer"[^>]*aria-live="polite"/);
  assert.match(html, /aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(html, /class="set-indicator"[^>]*aria-live="polite"/);
  assert.match(html, /id="clockText"[^>]*aria-live="polite"/);
  assert.match(html, /id="progressLabel"[^>]*aria-live="polite"/);
  assert.match(html, /function announceStatus/);
  assert.match(html, /function announceTimer/);
});

test('every input, select, and textarea has a label', function () {
  const unlabeled = [];
  for (const [name, html] of Object.entries(pages)) {
    for (const el of inputs(html)) {
      const idMatch = el.attrs.match(/\bid="([^"]+)"/);
      const id = idMatch && idMatch[1];
      const selfLabel = /aria-label=|aria-labelledby=/.test(el.attrs);
      if (!selfLabel && !hasLabel(html, id)) {
        unlabeled.push(name + ':' + (id || el.raw));
      }
    }
  }
  assert.deepEqual(unlabeled, []);
});

test('shared chrome has visible focus and reduced motion', function () {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.skip-link/);
  assert.match(pages.weekly, /class="skip-link"/);
  assert.match(pages.studio, /class="skip-link"/);
  assert.match(pages.workout, /class="skip-link"/);
  assert.match(pages.workout, /:focus-visible/);
});

test('muted text uses a contrast-safe gray, not #6b7280 or #4a4a6a', function () {
  for (const [name, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /#6b7280/, name + ' still uses #6b7280');
    assert.doesNotMatch(html, /#4a4a6a/, name + ' still uses #4a4a6a');
  }
  assert.match(pages.workout, /#9ca3af/);
  assert.match(pages.studio, /#9ca3af/);
});
