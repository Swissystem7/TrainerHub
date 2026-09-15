const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

test('docs/NO_CHECKOUT.md exists and requires off-site payment only', () => {
  const p = path.join(ROOT, 'docs/NO_CHECKOUT.md');
  assert.ok(fs.existsSync(p), 'NO_CHECKOUT.md missing');
  const md = fs.readFileSync(p, 'utf8');
  assert.match(md, /NO_CHECKOUT|no in-site checkout/i);
  assert.match(md, /off-site|Bit|PayBox/i);
  assert.match(md, /access code/i);
});
