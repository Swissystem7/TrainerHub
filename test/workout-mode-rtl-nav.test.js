'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

test('workout-mode back buttons use right-pointing arrow for RTL navigation', function () {
  // In Hebrew RTL, backward navigation points to the right (→), not left (←)
  assert.match(html, /<button type="button" class="go-back"[^>]*>→ בנה אימון<\/button>/);
  assert.match(html, /<button type="button" class="done-btn"[^>]*>→ בנה אימון<\/button>/);
  assert.doesNotMatch(html, /← בנה אימון/);
});

test('completion screen action buttons have explicit type="button"', function () {
  assert.match(html, /<button type="button" class="done-btn"[^>]*onclick="window\.location\.href='\.\.\/'"/);
  assert.match(html, /<button type="button" class="done-btn"[^>]*onclick="window\.location\.href='\.\.\/journal\.html'"/);
});
