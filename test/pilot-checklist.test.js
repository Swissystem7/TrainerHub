const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('docs/PILOT_CHECKLIST.md exists with 10-interview kill criteria', () => {
  const p = path.join(ROOT, 'docs/PILOT_CHECKLIST.md');
  assert.ok(fs.existsSync(p), 'PILOT_CHECKLIST.md missing');
  const md = read('docs/PILOT_CHECKLIST.md');
  assert.match(md, /10[- ]interview/i);
  assert.match(md, /kill/i);
  assert.match(md, /≥6|>=6|≥ 6/);
});

test('checklist mentions ILS 59 and TH-MAAMEN-59 when those strings exist in offer.html', () => {
  const offer = read('offer.html');
  const md = read('docs/PILOT_CHECKLIST.md');
  if (/ILS\s*59/.test(offer)) {
    assert.match(md, /ILS\s*59/);
  }
  if (/TH-MAAMEN-59/.test(offer)) {
    assert.match(md, /TH-MAAMEN-59/);
  }
  // Always keep MONETIZATION honesty anchors in the checklist itself
  assert.match(md, /ILS\s*59/);
  assert.match(md, /TH-MAAMEN-59/);
});
