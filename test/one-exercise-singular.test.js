'use strict';
// A pasted workout with one exercise missing from the library showed
// «1 תרגילים בלי סרטון במאגר. הם מוצגים כטקסט…» on the main page, and a
// request the library could answer with a single clip ended «(1 תרגילים)».
// One exercise now reads «תרגיל אחד»; two or more keep the plural count.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const Engine = require('../js/session-builder.js');

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

function ingestNotice(unmatched) {
  let inserted = '';
  const result = { insertAdjacentHTML: function (where, markup) { if (where === 'afterbegin') inserted = markup; } };
  const $ = function () { return result; };
  const TH = { esc: function (s) { return String(s); } };
  const renderIngest = new Function('$', 'TH', 'render', 'THAnalyzer',
    extractBlock('function renderIngest(ingested)') + '; return renderIngest;')(
    $, TH, function () {}, { analyzeSession: function () { return null; } });
  renderIngest({ workout: { analysis: null }, unmatched: unmatched, wishlist: [] });
  return inserted;
}

test('one exercise without a clip is reported in the singular', () => {
  const notice = ingestNotice(['כפיפות בטן הפוכות']);
  assert.match(notice, /תרגיל אחד בלי סרטון במאגר\. הוא מוצג כטקסט ונוסף לרשימת/);
  assert.doesNotMatch(notice, /1 תרגילים/);
});

test('several exercises without a clip keep the plural count', () => {
  const notice = ingestNotice(['א', 'ב', 'ג']);
  assert.match(notice, /3 תרגילים בלי סרטון במאגר\. הם מוצגים כטקסט ונוספו לרשימת/);
});

test('a closest match of a single clip reads «תרגיל אחד»', () => {
  const built = Engine.buildSession('אימון רגליים 20 דקות',
    [{ id: 'a', he: 'סקוואט', file: 'a.mp4', muscles: ['legs'] }]);
  assert.match(built.notice, /\(תרגיל אחד\)\.$/);
  assert.doesNotMatch(built.notice, /1 תרגילים/);
});
