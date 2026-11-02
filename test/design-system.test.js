'use strict';

// Static guards for the shared mobile-first design rules in css/app.css.
// See .claude/skills/trainerhub/SKILL.md ("Design rules").

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'app.css'), 'utf8');
const pageFiles = [
  'index.html', 'weekly.html', 'exercises.html', 'library.html', 'journal.html',
  'booklet.html', 'manage.html', 'offer.html', 'pitch.html', 'scan.html',
  'site-scan.html', 'workout-print.html', 'frontend/index.html', 'frontend/workout-mode.html'
];
const pages = Object.fromEntries(pageFiles.map(function (f) {
  return [f, fs.readFileSync(path.join(root, f), 'utf8')];
}));

test('app.css defines the shared spacing, type and touch-target tokens', function () {
  assert.match(css, /--th-tap:\s*44px/);
  ['--th-space-1', '--th-space-2', '--th-space-3', '--th-space-4', '--th-space-5', '--th-space-6',
    '--th-text-xs', '--th-text-sm', '--th-text-md', '--th-text-lg', '--th-gutter'].forEach(function (t) {
    assert.match(css, new RegExp(t + ':'), t);
  });
});

test('every control gets a 44px minimum height without touching display', function () {
  const rule = css.match(/button,\s*select,\s*summary,[^{]*\{([^}]*)\}/);
  assert.ok(rule, 'shared touch-target rule exists');
  assert.match(rule[1], /min-height:\s*var\(--th-tap\)/);
  assert.doesNotMatch(rule[1], /display\s*:/, 'display would override the UA [hidden] rule');
  assert.match(css, /\.th-btn\s*\{[^}]*min-height:\s*var\(--th-tap\)/);
  assert.match(css, /\.th-nav a, \.th-nav \.chip\s*\{[^}]*min-height:\s*var\(--th-tap\)/);
});

test('form fields use at least 16px so iOS does not zoom on focus', function () {
  assert.match(css, /body :is\(input, select, textarea\)\s*\{\s*font-size:\s*max\(var\(--th-text-md\), 1em\)/);
});

test('the nav is one swipeable row on phones with brand and current page first', function () {
  const mobile = css.match(/@media \(max-width: 720px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(mobile, 'mobile nav block exists');
  assert.match(mobile[1], /flex-wrap:\s*nowrap/);
  assert.match(mobile[1], /overflow-x:\s*auto/);
  assert.match(mobile[1], /\.th-nav \.brand\s*\{\s*order:\s*-2/);
  assert.match(mobile[1], /\.th-nav \.chip\.on\s*\{\s*order:\s*-1/);
});

test('every page nav marks the current page with aria-current', function () {
  for (const [name, html] of Object.entries(pages)) {
    if (!/class="th-nav/.test(html)) continue;
    assert.match(html, /<span class="chip on" aria-current="page">/, name);
  }
});

test('screen page styles never go below the 13px text floor', function () {
  for (const [name, html] of Object.entries(pages)) {
    if (name === 'pitch.html') continue; // A4 print sheet, sized in print units
    const styles = (html.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
    const tiny = styles.match(/font-size:\s*(0?\.[0-7]\d*rem|(?:[0-9]|1[0-2])px)\b/g) || [];
    assert.deepEqual(tiny, [], name);
  }
});
