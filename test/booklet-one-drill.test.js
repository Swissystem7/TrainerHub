'use strict';
// Searching the booklet drill bank for «שיכול» finds a single drill, and the
// count line read «1 תרגילים». One drill now reads «תרגיל אחד».

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'booklet.html'), 'utf8');

function renderDrills(count) {
  const start = html.indexOf('function renderDrills()');
  const open = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  const els = {};
  const $ = function (id) { return els[id] || (els[id] = { value: id === 'cat' ? 'warmup' : '', textContent: '', innerHTML: '' }); };
  const items = Array.from({ length: count }, function (_, i) { return { he: 'תרגיל ' + i }; });
  const B = { drills: function () { return items; } };
  const fn = new Function('$', 'B', 'TH', 'esc', 'credit',
    html.slice(start, end) + '; return renderDrills;')($, B, {}, String, function () { return ''; });
  fn();
  return els.drillStats.textContent;
}

test('one matching drill is counted in the singular', () => {
  assert.equal(renderDrills(1), 'תרגיל אחד');
});

test('zero and several drills keep the plural count', () => {
  assert.equal(renderDrills(0), '0 תרגילים');
  assert.equal(renderDrills(19), '19 תרגילים');
});
