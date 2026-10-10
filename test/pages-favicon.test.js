'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pages = [
  'journal.html', 'library.html', 'manage.html', 'offer.html', 'pitch.html',
  'weekly.html', 'workout-print.html', 'frontend/index.html',
];

for (const page of pages) {
  test(page + ' declares an inline icon, so the browser never requests a missing /favicon.ico', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    assert.match(html, /<link rel="icon" href="data:,">/);
  });
}
