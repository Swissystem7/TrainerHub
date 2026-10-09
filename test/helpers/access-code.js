'use strict';

// The paid trainer access code is not written anywhere in this repo — test
// files included, since GitHub Pages serves them too. Tests therefore:
//  - check the real code only through its hash, when the owner supplies it
//    locally in the TH_ACCESS_CODE env var (never committed);
//  - exercise redeemAccessCode's success path on a copy of js/core.js whose
//    ACCESS_HASH is swapped for the hash of a test-only code that the real
//    app rejects.

const fs = require('node:fs');
const path = require('node:path');

const CORE_PATH = path.join(__dirname, '..', '..', 'js', 'core.js');
const TEST_ONLY_CODE = 'TEST-ONLY-NOT-A-REAL-CODE';
const REVOKED_CODE = 'TH-MAAMEN-59'; // leaked on the live site; revoked 28.9.2026
const HASH_RE = /var ACCESS_HASH = (\d+);/;

function coreSource() {
  return fs.readFileSync(CORE_PATH, 'utf8');
}

function realAccessHash() {
  const m = coreSource().match(HASH_RE);
  if (!m) throw new Error('ACCESS_HASH not found in js/core.js');
  return Number(m[1]);
}

// Load js/core.js with ACCESS_HASH set to `hash`, as a separate module instance.
function loadCoreWithHash(hash) {
  const src = coreSource().replace(HASH_RE, 'var ACCESS_HASH = ' + (hash >>> 0) + ';');
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__filename', '__dirname', src);
  fn(mod, mod.exports, require, CORE_PATH, path.dirname(CORE_PATH));
  return mod.exports;
}

function loadCoreWithTestCode() {
  const TH = require(CORE_PATH);
  return loadCoreWithHash(TH.hashAccessCode(TEST_ONLY_CODE));
}

module.exports = {
  TEST_ONLY_CODE,
  REVOKED_CODE,
  realAccessHash,
  loadCoreWithHash,
  loadCoreWithTestCode,
  ownerCode: function () { return String(process.env.TH_ACCESS_CODE || '').trim(); }
};
