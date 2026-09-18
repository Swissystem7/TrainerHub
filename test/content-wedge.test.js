const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('docs/CONTENT_WEDGE.md exists and parks CRM as content-only SKU', () => {
  const p = path.join(ROOT, 'docs/CONTENT_WEDGE.md');
  assert.ok(fs.existsSync(p), 'docs/CONTENT_WEDGE.md missing');
  const md = fs.readFileSync(p, 'utf8');
  assert.match(md, /PARK|תוכן/);
  assert.match(md, /content-only|תוכן בלבד|content only/i);
  assert.match(md, /CRM/i);
  assert.match(md, /SKU|library|builder|ILS\s*59/i);
});
