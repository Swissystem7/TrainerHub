'use strict';

// GitHub Pages serves every file of this repo. The paid trainer access code
// must not be printed in any served document or page script: the app only
// needs its hash (js/core.js ACCESS_HASH). The test files are the one place
// that still spells it out, to exercise redeemAccessCode.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const CODE = /TH-MAAMEN-59/i;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'test', 'tests', '__pycache__']);

function walk(dir, exts, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), exts, out);
    } else if (exts.includes(path.extname(entry.name).toLowerCase())) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function leaks(exts) {
  return walk(root, exts, [])
    .filter((file) => CODE.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(root, file));
}

test('no served .md file prints the paid access code', function () {
  assert.deepEqual(leaks(['.md']), []);
});

test('no served page or script prints the paid access code', function () {
  assert.deepEqual(leaks(['.html', '.js', '.json', '.yml', '.yaml', '.txt']), []);
});

test('the app still redeems the code through its hash only', function () {
  const core = fs.readFileSync(path.join(root, 'js', 'core.js'), 'utf8');
  assert.match(core, /var ACCESS_HASH = \d+;/);
});
