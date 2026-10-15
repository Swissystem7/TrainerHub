'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');
const fn = page.slice(page.indexOf('function shareOrPreview('), page.indexOf('$(\'coachBuildForm\')'));

test('every client card carries its own gate host', function () {
  assert.match(page, /<article class="card">/);
  assert.match(page, /'<div class="th-gate-host"><\/div>' \+\s*'<\/article>'/);
});

test('the share gate lands under the card whose button was clicked, not the first card', function () {
  assert.match(page, /else if \(act === 'share'\) shareOrPreview\(c, false, btn\);/, 'the click handler passes the clicked button');
  assert.match(fn, /function shareOrPreview\(c, previewOnly, sourceBtn\)/);
  assert.match(fn, /sourceBtn\.closest\('article\.card'\)/, 'the host is resolved from the clicked card');
  assert.match(fn, /card\.querySelector\('\.th-gate-host'\)/);
  assert.doesNotMatch(fn, /document\.querySelector\('\.th-gate-host'\)/, 'a document-wide lookup always hits the first card');
});

test('an older gate under another card is removed before the new one is shown', function () {
  assert.match(fn, /\$\('list'\)\.querySelectorAll\('\.th-gate'\)/);
  assert.match(fn, /insertAdjacentHTML\('beforeend', TH\.gateMarkup\('share'\)\)/);
});
