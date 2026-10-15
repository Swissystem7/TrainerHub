'use strict';

// "פרק סרטון": every slice saved from one long Drive video must stay in the
// user catalog. Before this, addUserEntry treated any entry with the same
// driveId as the same clip, so the second segment replaced the first, and
// saveSegment always minted the id seg_<name>, so two slices with the same
// Hebrew name collided as well.

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Ingest = require('../js/ingest.js');

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.setCatalog({
    long_session: { id: 'long_session', he: 'אימון מלא מצולם', muscles: ['core'], driveId: 'drvLong', source: 'drive' }
  });
}

function userIds() {
  return TH.userCatalogList().map(function (e) { return e.id; });
}

test('two segments of the same Drive video both stay in the user catalog', function () {
  reset();
  const first = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק', startSec: 0, endSec: 30 });
  const second = Ingest.saveSegment({ driveId: 'drvLong', he: 'סקוואט', startSec: 30, endSec: 60 });
  assert.ok(first.entry && second.entry);
  assert.deepEqual(userIds(), [first.entry.id, second.entry.id]);
  const list = TH.userCatalogList();
  assert.equal(list[0].startSec, 0);
  assert.equal(list[0].endSec, 30);
  assert.equal(list[1].startSec, 30);
  assert.equal(list[1].endSec, 60);
});

test('two segments with the same Hebrew name get distinct ids', function () {
  reset();
  const a = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק', startSec: 0, endSec: 30 });
  const b = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק', startSec: 90, endSec: 120 });
  assert.notEqual(a.entry.id, b.entry.id);
  assert.equal(userIds().length, 2);
  assert.ok(TH.catalog[a.entry.id]);
  assert.ok(TH.catalog[b.entry.id]);
});

test('re-saving the same slice updates it instead of adding a duplicate', function () {
  reset();
  const a = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק', startSec: 0, endSec: 30 });
  const again = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק צידי', startSec: 0, endSec: 30 });
  assert.equal(again.entry.id, a.entry.id);
  assert.equal(userIds().length, 1);
  assert.equal(TH.userCatalogList()[0].he, 'פלאנק צידי');
});

test('a whole-video user entry added twice is still one entry', function () {
  reset();
  TH.addUserEntry({ id: 'user_a', he: 'תרגיל א', driveId: 'drvOther', source: 'drive' });
  TH.addUserEntry({ id: 'user_b', he: 'תרגיל ב', driveId: 'drvOther', source: 'drive' });
  assert.deepEqual(userIds(), ['user_b']);
});

test('a segment does not replace the whole-video entry of the same Drive file', function () {
  reset();
  TH.addUserEntry({ id: 'user_whole', he: 'אימון מלא', driveId: 'drvWhole', source: 'drive' });
  const seg = Ingest.saveSegment({ driveId: 'drvWhole', he: 'מטפס הרים', startSec: 10, endSec: 40 });
  assert.ok(seg.entry);
  assert.deepEqual(userIds(), ['user_whole', seg.entry.id]);
});
