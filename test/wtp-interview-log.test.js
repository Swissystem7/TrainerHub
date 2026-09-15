const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('docs/WTP_INTERVIEW_LOG.md exists as 10-row PT interview template', () => {
  const p = path.join(ROOT, 'docs/WTP_INTERVIEW_LOG.md');
  assert.ok(fs.existsSync(p), 'WTP_INTERVIEW_LOG.md missing');
  const md = read('docs/WTP_INTERVIEW_LOG.md');
  assert.match(md, /WTP|willingness/i);
  assert.match(md, /interview/i);
  assert.match(md, /\bPT\b|personal.?trainer/i);
  // 10 numbered empty rows in the table
  for (let i = 1; i <= 10; i++) {
    assert.match(md, new RegExp('\\|\\s*' + i + '\\s*\\|'));
  }
});

test('WTP interview log mentions ILS 59', () => {
  const md = read('docs/WTP_INTERVIEW_LOG.md');
  assert.match(md, /ILS\s*59/);
});
