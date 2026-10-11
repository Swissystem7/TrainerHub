'use strict';

// When the browser refuses to store (private mode, blocked site data, full
// quota), the paid activation and the "saved" messages must not report a
// success that did not happen.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
const working = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
const blocked = {
  getItem: function () { return null; },
  setItem: function () { throw new Error('QuotaExceededError'); },
  removeItem: function () {}
};
global.localStorage = working;
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/offer.html',
  pathname: '/TrainerHub/offer.html',
  hash: ''
};

const Code = require('./helpers/access-code.js');
const TH = Code.loadCoreWithTestCode();
const Ingest = require('../js/ingest.js');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('redeeming the right code on a browser that cannot store is not reported as activated', function () {
  global.localStorage = blocked;
  try {
    const r = TH.redeemAccessCode(Code.TEST_ONLY_CODE, 'סטודיו');
    assert.equal(r.ok, false);
    assert.match(r.error, /לא נשמר|חוסם/);
    assert.equal(TH.entitlement().canShare, false);
  } finally {
    global.localStorage = working;
  }
});

test('redeeming still works when storage works', function () {
  const r = TH.redeemAccessCode(Code.TEST_ONLY_CODE, 'סטודיו');
  assert.equal(r.ok, true);
  assert.equal(TH.entitlement().canShare, true);
  TH.clearEntitlement();
});

test('adding a library clip on a browser that cannot store returns no entry', function () {
  global.localStorage = blocked;
  try {
    const saved = TH.addUserEntry({ id: 'u_test_blocked', he: 'סקוואט בדיקה' });
    assert.equal(saved, null);
  } finally {
    global.localStorage = working;
  }
});

test('saving a video segment on a browser that cannot store returns an error', function () {
  global.localStorage = blocked;
  try {
    const r = Ingest.saveSegment({ driveId: 'drvBlocked1', he: 'פלאנק צידי', startSec: 10, endSec: 40 });
    assert.equal(r.error, 'storage');
    assert.match(r.message, /לא נשמר/);
  } finally {
    global.localStorage = working;
  }
});

test('manage.html checks the save result before saying it was saved', function () {
  const manage = read('manage.html');
  assert.match(manage, /if \(!TH\.addUserEntry\(entry\)\)/);
});
