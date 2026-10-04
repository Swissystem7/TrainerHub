'use strict';

// GitHub Pages serves every file of this repo. The paid trainer access code
// must not be printed in any served document or page script: the app only
// needs its hash (js/core.js ACCESS_HASH). The code was replaced on 28.9.2026
// after the earlier one (spelled below, now revoked) leaked in MONETIZATION.md;
// the current code is not written anywhere in the repo, tests included — they
// check it through its hash (see test/helpers/access-code.js).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mem = {};
global.localStorage = global.localStorage || {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
const TH = require('../js/core.js');
const Code = require('./helpers/access-code.js');
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

test('the leaked code is revoked: it no longer unlocks', function () {
  assert.notEqual(TH.hashAccessCode(Code.REVOKED_CODE), Code.realAccessHash());
  const r = TH.redeemAccessCode(Code.REVOKED_CODE, 'סטודיו');
  assert.equal(r.ok, false);
  assert.equal(TH.entitlement().canShare, false);
});

test('no file in the repo (tests included) holds a token that hashes to ACCESS_HASH', function () {
  const hash = Code.realAccessHash();
  const skip = new Set(['.git', 'node_modules', '__pycache__']);
  const files = [];
  (function walkAll(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) walkAll(path.join(dir, entry.name));
      } else if (/\.(md|html|js|json|ya?ml|txt|py|css|csv)$/i.test(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  })(root);
  const hits = [];
  for (const file of files) {
    const tokens = fs.readFileSync(file, 'utf8').match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+){1,3}/g) || [];
    if (tokens.some((t) => TH.hashAccessCode(t) === hash)) hits.push(path.relative(root, file));
  }
  assert.deepEqual(hits, []);
});

test('the owner code (TH_ACCESS_CODE, local only) matches ACCESS_HASH', { skip: !Code.ownerCode() && 'TH_ACCESS_CODE not set' }, function () {
  assert.equal(TH.hashAccessCode(Code.ownerCode()), Code.realAccessHash());
  const r = TH.redeemAccessCode(Code.ownerCode(), 'סטודיו');
  assert.equal(r.ok, true);
  TH.clearEntitlement();
});
