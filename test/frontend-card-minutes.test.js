'use strict';
// frontend/index.html: a pasted «ריצה 20 דקות» is one set of 1200 seconds, and
// the card (and «העתק») showed «1200″». Whole minutes now read «20 דק׳» like
// the print sheet and the booklet; «45″» and the rest stay in seconds.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'index.html'), 'utf8');

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

const exerciseDetailBits = new Function(extractBlock('function exerciseDetailBits(ex)') + '; return exerciseDetailBits;')();

test('a 20-minute run reads «20 דק׳», not «1200″»', () => {
  assert.deepEqual(exerciseDetailBits({ sets: 1, duration_seconds: 1200 }), ['20 דק׳']);
});

test('sets of whole minutes keep the «N×»', () => {
  assert.deepEqual(exerciseDetailBits({ sets: 4, duration_seconds: 240, rest_seconds: 60 }), ['4×4 דק׳', 'מנוחה 60″']);
});

test('short or uneven times stay in seconds', () => {
  assert.deepEqual(exerciseDetailBits({ sets: 3, duration_seconds: 45 }), ['3×45″']);
  assert.deepEqual(exerciseDetailBits({ sets: 1, duration_seconds: 90 }), ['90″']);
});
