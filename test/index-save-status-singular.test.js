'use strict';
// frontend/index.html: «שמור» saves one workout, and the status line read
// «נשמרו 1 אימונים בדפדפן זה.» - a plural verb and noun around the number 1.
// A single save now says «נשמר אימון אחד»; the Netanya batch keeps the plural.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');

function extractBlock(marker) {
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, 'marker not found: ' + marker);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced braces after ' + marker);
}

function statusAfterSaving(entries) {
  const status = { textContent: '' };
  const $ = function (id) { return id === 'libraryStatus' ? status : { textContent: '' }; };
  const WorkoutLibrary = { save: function () {} };
  const TH = { store: {}, KEYS: { saved: 'saved' } };
  const saveEntries = new Function('$', 'WorkoutLibrary', 'TH', 'renderHistory',
    extractBlock('function saveEntries(entries)') + '; return saveEntries;')(
    $, WorkoutLibrary, TH, function () {});
  assert.equal(saveEntries(entries), true);
  return status.textContent;
}

test('saving a single workout reports it in the singular', () => {
  assert.equal(statusAfterSaving([{ title: 'א' }]), 'נשמר אימון אחד בדפדפן זה.');
});

test('saving several workouts keeps the plural count', () => {
  assert.equal(statusAfterSaving([{ title: 'א' }, { title: 'ב' }, { title: 'ג' }]), 'נשמרו 3 אימונים בדפדפן זה.');
});
